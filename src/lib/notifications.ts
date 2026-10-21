import { SupabaseClient } from '@supabase/supabase-js';

export interface CreateNotificationParams {
  title: string;
  message: string;
  recipientId?: string | null;
  priority?: 'high' | 'medium' | 'normal';
  type?: string;
}

/**
 * Creates an event-driven notification in Supabase with 5-minute title+message deduplication.
 * Fails gracefully so secondary notification errors never abort primary database operations.
 */
export async function createSystemNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
) {
  try {
    const title = params.title.trim();
    const message = params.message.trim();
    const recipientId = params.recipientId || null;
    const priority = params.priority || 'normal';
    const type = params.type || 'info';

    if (!title || !message) return null;

    // Deduplication check: only suppress if BOTH title AND message match for the same recipient in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    let dupQuery = supabase
      .from('notifications')
      .select('id')
      .eq('title', title)
      .eq('message', message)
      .gte('created_at', fiveMinutesAgo);

    if (recipientId) {
      dupQuery = dupQuery.eq('recipient_id', recipientId);
    } else {
      dupQuery = dupQuery.is('recipient_id', null);
    }

    const { data: existing } = await dupQuery.limit(1);
    if (existing && existing.length > 0) {
      return { id: existing[0].id, deduplicated: true };
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert([
        {
          title,
          message,
          recipient_id: recipientId,
          priority,
          type,
          read: false,
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('createSystemNotification insert warning:', error.message);
      return null;
    }

    return { id: data?.id, deduplicated: false };
  } catch (err: any) {
    console.warn('createSystemNotification error:', err?.message || err);
    return null;
  }
}

export type TableStatus = 'available' | 'absent' | 'permission_denied' | 'transient_error';

/**
 * Classifies Supabase/PostgREST errors to distinguish genuinely absent tables
 * from security rejections and transient network/database outages.
 */
export function classifyTableError(error: any): TableStatus {
  if (!error) return 'available';

  const code = String(error.code || error.statusCode || error.status || '');
  const message = String(error.message || error.details || error.hint || '').toLowerCase();

  // 1. Table or column genuinely absent from schema / schema cache
  if (
    code === '42P01' || // PostgreSQL: undefined_table
    code === 'PGRST205' || // PostgREST: could not find relation in schema cache
    code === 'PGRST204' || // PostgREST: column not found
    code === 'PGRST200' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('relation "public.notification_reads" does not exist') ||
    message.includes('relation "notification_reads" does not exist') ||
    message.includes('could not find the relation')
  ) {
    return 'absent';
  }

  // 2. Permission / RLS rejection
  if (
    code === '42501' || // PostgreSQL: insufficient_privilege
    code === 'PGRST301' ||
    code === '401' ||
    code === '403' ||
    message.includes('permission denied') ||
    message.includes('policy') ||
    message.includes('violates row-level security') ||
    message.includes('jwt expired')
  ) {
    return 'permission_denied';
  }

  // 3. Transient network, timeout, or database infrastructure failure
  return 'transient_error';
}

export interface CandidateNotification {
  id: string | number;
  created_at?: string | number | Date | null;
  recipient_id?: string | null;
}

export interface UserBroadcastReadContext {
  readBroadcastIds: Set<string>;
  markAllReadTimestamp: number | null;
}

/**
 * Determines whether a specific broadcast notification is read for a user
 * based on dedicated/activity read records and mark-all-read high-water mark timestamp.
 */
export function isBroadcastNotificationRead(
  notificationId: string | number,
  notificationCreatedAt: string | number | Date | null | undefined,
  context: UserBroadcastReadContext
): boolean {
  if (context.readBroadcastIds.has(String(notificationId))) return true;
  if (context.markAllReadTimestamp !== null) {
    const t = notificationCreatedAt ? new Date(notificationCreatedAt).getTime() : 0;
    if (!Number.isNaN(t) && t <= context.markAllReadTimestamp) return true;
  }
  return false;
}

export interface FetchUserBroadcastReadContextOptions {
  maxPages?: number;
  pageSize?: number;
}

/**
 * Maximum number of notification IDs placed in a single PostgREST `in.(...)` filter.
 * notification IDs are BIGINT (<= 19 digits). supabase-js URL-encodes the list, so each
 * ID costs at most ~22 bytes: 100 IDs ~= 2.2 KB, well below common 8 KB proxy URL limits.
 * A single unchunked filter for 20,000 IDs would be ~180-440 KB and fail with HTTP 414.
 */
export const NOTIFICATION_ID_CHUNK_SIZE = 100;
/** Number of ID chunks queried concurrently. */
export const NOTIFICATION_ID_CHUNK_CONCURRENCY = 4;

type PageResponse = { data: any[] | null; error: any; count?: number | null };

function throwClassified(error: any, table: string): never {
  const status = classifyTableError(error);
  if (status === 'permission_denied') {
    throw new Error(`Permission denied querying ${table}: ${error?.message || error}`);
  }
  throw new Error(`Database error querying ${table}: ${error?.message || error}`);
}

function isStrictNotificationError(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    msg.includes('Incomplete ') ||
    msg.includes('Permission denied') ||
    msg.includes('Database error')
  );
}

/**
 * Offset-paginated scan whose completeness is established from the server-reported exact row
 * count, never from "fewer rows than requested" (which a PostgREST `max_rows` cap also produces).
 *
 * - Every page requests `count: 'exact'`; the scan ends only when offset >= latest count.
 * - The offset advances by rows actually returned, so a server cap below `pageSize` causes more,
 *   smaller pages instead of a silent truncation.
 * - Rows inserted during the scan (ordered DESC) only shift existing rows to higher offsets, which
 *   can cause harmless re-reads but never skips. Assumes rows are not deleted mid-scan.
 * - Throws if the count is missing, if an empty page is returned before the count is reached,
 *   or if `maxPages` pages are consumed without completing or resolving.
 */
async function scanPagesWithExactCount(params: {
  table: string;
  incompleteLabel: string;
  pageSize: number;
  maxPages: number;
  fetchPage: (from: number, to: number) => PromiseLike<PageResponse>;
  onRows: (rows: any[], totalCount: number) => boolean;
  describeUnresolved?: () => string;
}): Promise<{ resolvedEarly: boolean; pagesFetched: number }> {
  const { table, incompleteLabel, pageSize, maxPages, fetchPage, onRows, describeUnresolved } = params;
  let offset = 0;
  let pagesFetched = 0;

  while (true) {
    if (pagesFetched >= maxPages) {
      throw new Error(
        `${incompleteLabel}: safety limit of ${maxPages} page(s) reached${describeUnresolved ? describeUnresolved() : ''}`
      );
    }

    let response: PageResponse;
    try {
      response = await fetchPage(offset, offset + pageSize - 1);
    } catch (err: any) {
      if (isStrictNotificationError(err)) throw err;
      throwClassified(err, table);
    }
    pagesFetched++;

    if (response.error) throwClassified(response.error, table);

    const total = response.count;
    if (typeof total !== 'number' || !Number.isFinite(total) || total < 0) {
      throw new Error(
        `${incompleteLabel}: server did not return an exact row count for ${table}; completeness cannot be established`
      );
    }

    const rows = response.data ?? [];
    if (rows.length > 0 && onRows(rows, total)) {
      return { resolvedEarly: true, pagesFetched };
    }

    offset += rows.length;
    if (offset >= total) {
      return { resolvedEarly: false, pagesFetched };
    }
    if (rows.length === 0) {
      throw new Error(
        `${incompleteLabel}: ${table} returned no rows at offset ${offset} although ${total} row(s) were reported; completeness cannot be established`
      );
    }
  }
}

function normalizeNotificationId(id: string | number): string | number {
  return typeof id === 'string' && /^[0-9]+$/.test(id) ? Number(id) : id;
}

/**
 * Returns the authoritative mark-all-read high-water mark for a user (O(1) query).
 * Absent table -> null. Permission or transient errors -> thrown.
 */
export async function fetchMarkAllReadTimestamp(
  supabase: SupabaseClient,
  userId: string
): Promise<number | null> {
  let markAllLogs: any[] | null = null;
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action, metadata, created_at')
      .eq('user_id', userId)
      .eq('action', 'mark_all_notifications_read')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);
    if (error) {
      const status = classifyTableError(error);
      if (status === 'permission_denied') {
        throw new Error(`Permission denied querying mark_all_notifications_read: ${error.message}`);
      }
      if (status === 'transient_error') {
        throw new Error(`Database error querying mark_all_notifications_read: ${error.message}`);
      }
      return null;
    }
    markAllLogs = data;
  } catch (err: any) {
    if (isStrictNotificationError(err)) throw err;
    const status = classifyTableError(err);
    if (status === 'absent') return null;
    throw new Error(`Database error querying mark_all_notifications_read: ${err?.message || err}`);
  }

  if (!markAllLogs || markAllLogs.length === 0) return null;
  const log = markAllLogs[0];
  let t = log.created_at ? new Date(log.created_at).getTime() : 0;
  try {
    const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
    if (meta?.readAt) {
      const parsed = new Date(meta.readAt).getTime();
      if (!Number.isNaN(parsed)) t = Math.max(t, parsed);
    }
  } catch {}
  return !Number.isNaN(t) && t > 0 ? t : null;
}

/**
 * Looks up dedicated notification_reads rows for the candidate IDs in bounded chunks.
 * Returns null when the table is genuinely absent (legacy fallback), otherwise the set of read IDs.
 * Any permission/transient error, or a response truncated below its exact count, is thrown.
 */
async function fetchDedicatedReadsChunked(
  supabase: SupabaseClient,
  userId: string,
  candidateIds: (string | number)[]
): Promise<Set<string> | null> {
  const read = new Set<string>();
  const chunks: (string | number)[][] = [];
  for (let i = 0; i < candidateIds.length; i += NOTIFICATION_ID_CHUNK_SIZE) {
    chunks.push(candidateIds.slice(i, i + NOTIFICATION_ID_CHUNK_SIZE).map(normalizeNotificationId));
  }

  const queryChunk = async (chunk: (string | number)[]) => {
    try {
      return await supabase
        .from('notification_reads')
        .select('notification_id', { count: 'exact' })
        .eq('user_id', userId)
        .in('notification_id', chunk);
    } catch (err: any) {
      return { data: null, error: err, count: null };
    }
  };

  const absorb = (res: PageResponse, chunkIndex: number): 'absent' | 'ok' => {
    if (res.error) {
      const status = classifyTableError(res.error);
      if (status === 'absent' && chunkIndex === 0) return 'absent';
      if (status === 'permission_denied') {
        throw new Error(`Permission denied querying notification_reads: ${res.error?.message || res.error}`);
      }
      throw new Error(`Database error querying notification_reads: ${res.error?.message || res.error}`);
    }
    const rows = res.data ?? [];
    if (typeof res.count !== 'number' || rows.length < res.count) {
      throw new Error(
        `Database error querying notification_reads: chunk ${chunkIndex} returned ${rows.length} of ${
          typeof res.count === 'number' ? res.count : 'unknown'
        } row(s); response may be truncated`
      );
    }
    for (const r of rows) {
      if (r.notification_id != null) read.add(String(r.notification_id));
    }
    return 'ok';
  };

  if (chunks.length === 0) return read;

  // Probe with the first chunk: a genuinely absent table activates the activity_logs fallback.
  if (absorb((await queryChunk(chunks[0])) as PageResponse, 0) === 'absent') return null;

  for (let i = 1; i < chunks.length; i += NOTIFICATION_ID_CHUNK_CONCURRENCY) {
    const batch = chunks.slice(i, i + NOTIFICATION_ID_CHUNK_CONCURRENCY);
    const results = await Promise.all(batch.map((c) => queryChunk(c)));
    results.forEach((res, j) => absorb(res as PageResponse, i + j));
  }
  return read;
}

/**
 * Resolves broadcast read states for a specific user without arbitrary history caps:
 * 1. Dedicated query for latest mark_all_notifications_read event (O(1), displacement immune).
 * 2. Progressive dual-read: checks dedicated notification_reads table in bounded ID chunks.
 *    Strictly distinguishes genuine table absence from permission or transient network errors.
 * 3. Paginated, candidate-scoped activity_logs scan: bounded to the oldest candidate creation
 *    timestamp, deterministic (created_at, id) ordering, early exit once all candidates resolve.
 * 4. Completeness semantics: end of history is established from the exact server row count, not
 *    from short pages; incomplete scans (safety limit, missing count, empty page before count)
 *    throw rather than return potentially false read/unread state.
 * 5. Lazy-backfill: writes historical reads found in activity_logs to notification_reads when available.
 */
export async function fetchUserBroadcastReadContext(
  supabase: SupabaseClient,
  userId: string,
  candidateNotifications?: CandidateNotification[],
  options?: FetchUserBroadcastReadContextOptions
): Promise<UserBroadcastReadContext> {
  // 1. Authoritative mark-all-read timestamp
  const markAllReadTimestamp = await fetchMarkAllReadTimestamp(supabase, userId);

  // 2. Identify broadcast candidates
  const broadcastCandidates = (candidateNotifications ?? []).filter(
    (c) => c.recipient_id === null || c.recipient_id === undefined
  );

  // Candidates were supplied but none are broadcasts: nothing to resolve.
  if (candidateNotifications !== undefined && broadcastCandidates.length === 0) {
    return { readBroadcastIds: new Set<string>(), markAllReadTimestamp };
  }

  const isCoveredByMarkAll = (c: CandidateNotification) => {
    if (markAllReadTimestamp === null) return false;
    const t = c.created_at ? new Date(c.created_at).getTime() : 0;
    return !Number.isNaN(t) && t <= markAllReadTimestamp;
  };

  // All candidate broadcasts are covered by the mark-all high-water mark
  if (broadcastCandidates.length > 0 && broadcastCandidates.every(isCoveredByMarkAll)) {
    return { readBroadcastIds: new Set<string>(), markAllReadTimestamp };
  }

  const readBroadcastIds = new Set<string>();

  // 3. Dual-read: dedicated notification_reads table (chunked, bounded URLs)
  let dedicatedTableAvailable = false;
  if (candidateNotifications !== undefined) {
    const uncovered = broadcastCandidates.filter((c) => !isCoveredByMarkAll(c)).map((c) => c.id);
    const dedicated = await fetchDedicatedReadsChunked(supabase, userId, uncovered);
    if (dedicated !== null) {
      dedicatedTableAvailable = true;
      dedicated.forEach((id) => readBroadcastIds.add(id));
    }
  }

  const pendingCandidates = broadcastCandidates.filter(
    (c) => !readBroadcastIds.has(String(c.id)) && !isCoveredByMarkAll(c)
  );

  if (candidateNotifications !== undefined && pendingCandidates.length === 0) {
    return { readBroadcastIds, markAllReadTimestamp };
  }

  // Lower bound on log creation, with a 60-second clock-skew margin
  let lowerBoundTime = markAllReadTimestamp ?? 0;
  const candidateTimes = pendingCandidates
    .map((c) => (c.created_at ? new Date(c.created_at).getTime() : 0))
    .filter((t) => t > 0);
  if (candidateTimes.length > 0) {
    lowerBoundTime = Math.max(lowerBoundTime, Math.max(0, Math.min(...candidateTimes) - 60_000));
  }

  // 4. Count-verified paginated activity_logs scan
  const neededCandidateIds = new Set(pendingCandidates.map((c) => String(c.id)));
  const backfillIds: (string | number)[] = [];
  const maxPages = options?.maxPages ?? 50;
  const pageSize = options?.pageSize ?? 1000;

  await scanPagesWithExactCount({
    table: 'activity_logs',
    incompleteLabel: 'Incomplete activity-log scan',
    pageSize,
    maxPages,
    fetchPage: (from, to) => {
      let q = supabase
        .from('activity_logs')
        .select('id, action, metadata, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .eq('action', 'mark_notification_read');
      if (lowerBoundTime > 0) {
        q = q.gte('created_at', new Date(lowerBoundTime).toISOString());
      }
      return q
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
    },
    onRows: (rows) => {
      for (const log of rows) {
        try {
          const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
          if (meta?.notificationId != null) {
            const idStr = String(meta.notificationId);
            readBroadcastIds.add(idStr);
            if (neededCandidateIds.delete(idStr) && dedicatedTableAvailable) {
              backfillIds.push(meta.notificationId);
            }
          }
        } catch {}
      }
      return candidateNotifications !== undefined && neededCandidateIds.size === 0;
    },
    describeUnresolved: () =>
      neededCandidateIds.size > 0
        ? ` with ${neededCandidateIds.size} unresolved notification candidate(s)`
        : '',
  });

  // 5. Lazy-backfill into dedicated table (best-effort; read state is already established)
  if (dedicatedTableAvailable && backfillIds.length > 0) {
    try {
      const backfillRows = backfillIds.map((id) => ({
        notification_id: normalizeNotificationId(id),
        user_id: userId,
      }));
      const { error } = await supabase
        .from('notification_reads')
        .upsert(backfillRows, { onConflict: 'notification_id,user_id', ignoreDuplicates: true });
      if (error) console.warn('notification_reads lazy-backfill warning:', error.message);
    } catch {
      // Non-fatal lazy backfill failure
    }
  }

  return { readBroadcastIds, markAllReadTimestamp };
}

// ---------------------------------------------------------------------------
// Strict read-state persistence (notification-specific; recordActivity remains best-effort)
// ---------------------------------------------------------------------------

export interface NotificationApiResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Inserts a notification read-state event into activity_logs and throws if the insert fails.
 * Unlike the shared best-effort `recordActivity`, the Supabase `{ error }` result is checked.
 */
export async function recordNotificationReadEventStrict(
  supabase: SupabaseClient,
  userId: string,
  action: 'mark_notification_read' | 'mark_all_notifications_read',
  metadata: Record<string, unknown>
): Promise<void> {
  let error: any = null;
  try {
    const res = await supabase.from('activity_logs').insert([
      {
        user_id: userId,
        action,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString(),
      },
    ]);
    error = res?.error ?? null;
  } catch (err: any) {
    error = err;
  }
  if (error) {
    throw new Error(`Failed to persist ${action}: ${error?.message || error}`);
  }
}

async function bestEffortActivity(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  metadata: Record<string, unknown>
) {
  try {
    const { error } = await supabase.from('activity_logs').insert([
      { user_id: userId, action, metadata: JSON.stringify(metadata), created_at: new Date().toISOString() },
    ]);
    if (error) console.warn(`activity log (${action}) warning:`, error.message);
  } catch {}
}

// In-process in-flight promise cache to coalesce concurrent mark-read requests
// for the same user and broadcast notification.
// Note: While this prevents duplicate queries and inserts within a single Node.js process,
// atomic database-level idempotency across distributed instances requires the dedicated
// `notification_reads` table (unique constraint).
const inFlightLegacyMarkReads = new Map<string, Promise<NotificationApiResult>>();

/**
 * Mark-one-read business logic (route handler is a thin cookie/auth wrapper around this).
 * - Private notification: the row update is the persistence; failure -> 500.
 * - Broadcast notification: the shared row is never mutated. Read state must be persisted in
 *   notification_reads (idempotent upsert on the unique key) or, when that table is genuinely
 *   absent, in activity_logs (existing event is reused so retries do not insert duplicates).
 *   Any persistence failure returns 500, never success.
 */
export async function markNotificationReadForUser(
  supabase: SupabaseClient,
  userId: string,
  rawNotificationId: string
): Promise<NotificationApiResult> {
  const idValue = normalizeNotificationId(rawNotificationId);

  const { data: target, error: fetchError } = await supabase
    .from('notifications')
    .select('id, recipient_id')
    .eq('id', idValue)
    .or(`recipient_id.is.null,recipient_id.eq.${userId}`)
    .maybeSingle();

  if (fetchError) return { status: 500, body: { error: fetchError.message } };
  if (!target) return { status: 404, body: { error: 'Notification not found' } };

  if (target.recipient_id === userId) {
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', idValue)
      .eq('recipient_id', userId);
    if (updateError) return { status: 500, body: { error: updateError.message } };
    await bestEffortActivity(supabase, userId, 'mark_notification_read', { notificationId: idValue });
    return { status: 200, body: { success: true } };
  }

  if (target.recipient_id !== null && target.recipient_id !== undefined) {
    return { status: 404, body: { error: 'Notification not found' } };
  }

  // Broadcast: 1) dedicated table (idempotent via unique (notification_id, user_id))
  let dedicatedError: any = null;
  try {
    const res = await supabase
      .from('notification_reads')
      .upsert(
        { notification_id: idValue, user_id: userId },
        { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
      );
    dedicatedError = res?.error ?? null;
  } catch (err: any) {
    dedicatedError = err;
  }

  if (!dedicatedError) {
    // Read state is persisted; legacy audit event is best-effort.
    await bestEffortActivity(supabase, userId, 'mark_notification_read', { notificationId: idValue });
    return { status: 200, body: { success: true } };
  }

  if (classifyTableError(dedicatedError) !== 'absent') {
    return {
      status: 500,
      body: { error: `Failed to persist notification read: ${dedicatedError?.message || dedicatedError}` },
    };
  }

  // 2) Legacy path: activity_logs is the only persistence.
  // Coalesce concurrent in-flight requests in the same process to prevent race-condition duplicates.
  const inFlightKey = `${userId}:${idValue}`;
  const existingInFlight = inFlightLegacyMarkReads.get(inFlightKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const executeLegacyMarkRead = async (): Promise<NotificationApiResult> => {
    try {
      const metadataText = JSON.stringify({ notificationId: idValue });
      const { data: existing, error: existingError } = await supabase
        .from('activity_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('action', 'mark_notification_read')
        .eq('metadata', metadataText)
        .limit(1);
      if (existingError) {
        return {
          status: 500,
          body: { error: `Failed to verify existing notification read: ${existingError.message}` },
        };
      }
      if (existing && existing.length > 0) {
        return { status: 200, body: { success: true, alreadyRead: true } };
      }

      try {
        await recordNotificationReadEventStrict(supabase, userId, 'mark_notification_read', {
          notificationId: idValue,
        });
      } catch (err: any) {
        return { status: 500, body: { error: err.message } };
      }
      return { status: 200, body: { success: true } };
    } finally {
      inFlightLegacyMarkReads.delete(inFlightKey);
    }
  };

  const promise = executeLegacyMarkRead();
  inFlightLegacyMarkReads.set(inFlightKey, promise);
  return promise;
}

/**
 * Mark-all-read business logic. Private rows are updated; the broadcast high-water mark event
 * is required persistence and must succeed. A retry writes a newer high-water mark, which is
 * semantically idempotent (covers a superset) and creates no per-notification duplicates.
 */
export async function markAllNotificationsReadForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationApiResult> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', userId)
    .eq('read', false);
  if (error) return { status: 500, body: { error: error.message } };

  try {
    await recordNotificationReadEventStrict(supabase, userId, 'mark_all_notifications_read', {
      readAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return {
      status: 500,
      body: {
        error: err.message,
        partialSuccess: true,
        privateUpdated: true,
      },
    };
  }
  return { status: 200, body: { success: true } };
}

// ---------------------------------------------------------------------------
// Unread count (route handler is a thin cookie/auth wrapper around this)
// ---------------------------------------------------------------------------

export interface UnreadCountOptions {
  broadcastPageSize?: number;
  maxBroadcastPages?: number;
  readContext?: FetchUserBroadcastReadContextOptions;
}

export async function computeUserUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
  options?: UnreadCountOptions
): Promise<number> {
  // 1. Private unread
  const { count: privateUnread, error: privErr } = await supabase
    .from('notifications')
    .select('id', { head: true, count: 'exact' })
    .eq('read', false)
    .eq('recipient_id', userId);
  if (privErr) throwClassified(privErr, 'notifications');
  if (typeof privateUnread !== 'number') {
    throw new Error('Database error querying notifications: private unread count unavailable');
  }

  // 2. Mark-all high-water mark prunes the broadcast candidate set
  const markAllReadTimestamp = await fetchMarkAllReadTimestamp(supabase, userId);

  // 3. Gather candidate broadcasts with count-verified pagination
  const pageSize = options?.broadcastPageSize ?? 1000;
  const maxPages = options?.maxBroadcastPages ?? 20;
  const candidates: Array<{ id: string | number; created_at: string; recipient_id: null }> = [];
  const seen = new Set<string>();

  await scanPagesWithExactCount({
    table: 'notifications',
    incompleteLabel: 'Incomplete broadcast notification scan',
    pageSize,
    maxPages,
    fetchPage: (from, to) => {
      let q = supabase
        .from('notifications')
        .select('id, created_at', { count: 'exact' })
        .is('recipient_id', null);
      if (markAllReadTimestamp !== null) {
        q = q.gt('created_at', new Date(markAllReadTimestamp).toISOString());
      }
      return q.order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to);
    },
    onRows: (rows, total) => {
      if (total > pageSize * maxPages) {
        throw new Error(
          `Incomplete broadcast notification scan: ${total} broadcast notification(s) exceed the safety limit of ${maxPages} page(s) x ${pageSize}`
        );
      }
      for (const r of rows) {
        const key = String(r.id);
        if (!seen.has(key)) {
          seen.add(key);
          candidates.push({ id: r.id, created_at: r.created_at, recipient_id: null });
        }
      }
      return false;
    },
  });

  // 4. Resolve read state
  const ctx = await fetchUserBroadcastReadContext(supabase, userId, candidates, options?.readContext);
  let unreadBroadcast = 0;
  for (const b of candidates) {
    if (!isBroadcastNotificationRead(b.id, b.created_at, ctx)) unreadBroadcast++;
  }
  return privateUnread + unreadBroadcast;
}
