"use client";

import { invalidateClientCache } from "./client-cache";

export const OFFLINE_CACHE_DB = "jiddah_cache_v1";
export const OFFLINE_READ_STORE = "read_cache";
export const OFFLINE_OUTBOX_STORE = "jiddah_mutation_outbox";
export const OFFLINE_SYNC_EVENT = "jiddah:offline-sync-changed";
export const MARKS_UPDATED_EVENT = "jiddah:marks-updated";

export interface OutboxMutation {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  body: unknown;
  createdAt: number;
  label?: string;
  retries: number;
  lastError?: string | null;
}

interface ReadCacheEntry<T = unknown> {
  key: string;
  data: T;
  updatedAt: number;
}

export interface OfflineSyncStatusSnapshot {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  lastSyncedAt: number | null;
}

// Fallback memory store when running in restricted/non-IndexedDB environments (SSR/Node tests)
const memoryReadStore = new Map<string, ReadCacheEntry>();
const memoryOutboxStore = new Map<string, OutboxMutation>();
const pendingIdbWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();
const recentRevalidateAt = new Map<string, number>();
const REVALIDATE_COOLDOWN_MS = 30000;
let cachedDbPromise: Promise<IDBDatabase> | null = null;

let syncInFlight = false;
let lastSyncError: string | null = null;
let lastSyncedTimestamp: number | null = null;

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openOfflineDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (cachedDbPromise) {
    return cachedDbPromise;
  }

  cachedDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(OFFLINE_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(OFFLINE_READ_STORE)) {
        db.createObjectStore(OFFLINE_READ_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(OFFLINE_OUTBOX_STORE)) {
        db.createObjectStore(OFFLINE_OUTBOX_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        cachedDbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      cachedDbPromise = null;
      reject(request.error ?? new Error("Failed to open IndexedDB"));
    };
  });
  return cachedDbPromise;
}

async function idbGetReadCache<T>(key: string): Promise<ReadCacheEntry<T> | null> {
  const memHit = memoryReadStore.get(key) as ReadCacheEntry<T> | undefined;
  if (memHit) return memHit;
  if (!hasIndexedDb()) {
    return null;
  }
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_READ_STORE, "readonly");
      const store = tx.objectStore(OFFLINE_READ_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const res = (req.result as ReadCacheEntry<T> | undefined) ?? null;
        if (res) memoryReadStore.set(key, res);
        resolve(res);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return (memoryReadStore.get(key) as ReadCacheEntry<T> | undefined) ?? null;
  }
}

async function idbPutReadCache<T>(key: string, data: T): Promise<void> {
  const entry: ReadCacheEntry<T> = { key, data, updatedAt: Date.now() };
  memoryReadStore.set(key, entry);
  if (!hasIndexedDb()) return;

  const existingTimer = pendingIdbWriteTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Debounce IndexedDB disk transactions so rapid state/mark updates never block the UI thread
  const timer = setTimeout(async () => {
    pendingIdbWriteTimers.delete(key);
    const latest = memoryReadStore.get(key) ?? entry;
    try {
      const db = await openOfflineDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(OFFLINE_READ_STORE, "readwrite");
        const store = tx.objectStore(OFFLINE_READ_STORE);
        const req = store.put(latest);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Non-fatal cache write failure
    }
  }, 250);
  pendingIdbWriteTimers.set(key, timer);
}

async function idbListOutbox(): Promise<OutboxMutation[]> {
  if (!hasIndexedDb()) {
    return Array.from(memoryOutboxStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
  try {
    const db = await openOfflineDb();
    const rows = await new Promise<OutboxMutation[]>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_OUTBOX_STORE, "readonly");
      const store = tx.objectStore(OFFLINE_OUTBOX_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as OutboxMutation[]) ?? []);
      req.onerror = () => reject(req.error);
    });
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return Array.from(memoryOutboxStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
}

async function idbPutOutbox(item: OutboxMutation): Promise<void> {
  memoryOutboxStore.set(item.id, item);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_OUTBOX_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_OUTBOX_STORE);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Keep in-memory backup if IDB quota exceeded
  }
}

async function idbDeleteOutbox(id: string): Promise<void> {
  memoryOutboxStore.delete(id);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_OUTBOX_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_OUTBOX_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore delete error
  }
}

export async function clearOfflineCaches(): Promise<void> {
  memoryReadStore.clear();
  memoryOutboxStore.clear();
  invalidateClientCache();
  if (!hasIndexedDb()) {
    await notifySyncListeners();
    return;
  }
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction([OFFLINE_READ_STORE, OFFLINE_OUTBOX_STORE], "readwrite");
      tx.objectStore(OFFLINE_READ_STORE).clear();
      tx.objectStore(OFFLINE_OUTBOX_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Ignore clear failure
  }
  await notifySyncListeners();
}

export async function getPendingOutboxCount(): Promise<number> {
  const items = await idbListOutbox();
  return items.length;
}

export async function getPendingOutboxItems(): Promise<OutboxMutation[]> {
  return idbListOutbox();
}

function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function getOfflineSyncStatus(): Promise<OfflineSyncStatusSnapshot> {
  const pendingCount = await getPendingOutboxCount();
  const isOnline = !isBrowserOffline();
  return {
    pendingCount,
    isOnline,
    isSyncing: syncInFlight,
    lastError: lastSyncError,
    lastSyncedAt: lastSyncedTimestamp,
  };
}

export async function notifySyncListeners(): Promise<void> {
  if (typeof window === "undefined") return;
  const snapshot = await getOfflineSyncStatus();
  window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_EVENT, { detail: snapshot }));
}

export function broadcastMarksUpdated(detail?: Record<string, unknown>): void {
  invalidateClientCache();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MARKS_UPDATED_EVENT, { detail: detail ?? {} }));
}

export async function syncOfflineUserProfileCache(profile: Record<string, unknown>): Promise<void> {
  await idbPutReadCache("/api/settings/user", { data: profile });
  invalidateClientCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("jiddah:profile-updated", { detail: profile }));
  }
  await notifySyncListeners();
}

export interface OfflineFetchOptions {
  timeoutMs?: number;
  cacheKey?: string;
  forceNetwork?: boolean;
  onBackgroundRefresh?: (data: unknown) => void;
}

function isAbortError(err: unknown): boolean {
  if (!err) return false;
  if (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") {
    return true;
  }
  const name = typeof err === "object" && "name" in err ? String((err as { name?: string }).name) : "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return name === "AbortError" || msg.toLowerCase().includes("aborted");
}

/**
 * Stale-While-Revalidate JSON fetcher backed by IndexedDB (`jiddah_cache_v1`).
 * Uses a mobile-safe 35000ms default timeout and throttled background
 * revalidation so weak mobile data does not falsely flip offline or spam requests.
 */
export async function offlineFetchJson<T>(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const cacheKey = options.cacheKey ?? url;
  const timeoutMs = options.timeoutMs ?? 35000;
  const cached = await idbGetReadCache<T>(cacheKey);

  const fetchWithTimeout = async (attemptTimeoutMs = timeoutMs): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), attemptTimeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        const errMsg =
          (errPayload as { error?: string })?.error || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }
      const json = (await response.json()) as T;
      await idbPutReadCache(cacheKey, json);
      return json;
    } finally {
      clearTimeout(timer);
    }
  };

  if (cached && !options.forceNetwork) {
    // Revalidate in background when online (throttled per key on weak connections)
    const now = Date.now();
    const lastReval = recentRevalidateAt.get(cacheKey) ?? 0;
    if (!isBrowserOffline() && now - lastReval > REVALIDATE_COOLDOWN_MS) {
      recentRevalidateAt.set(cacheKey, now);
      fetchWithTimeout()
        .then((fresh) => {
          options.onBackgroundRefresh?.(fresh);
        })
        .catch(() => {
          // Retain cached value silently when background refresh fails
        });
    }
    return { data: cached.data, fromCache: true, stale: true };
  }

  try {
    const fresh = await fetchWithTimeout();
    return { data: fresh, fromCache: false, stale: false };
  } catch (err) {
    if (cached) {
      return { data: cached.data, fromCache: true, stale: true };
    }
    if (isAbortError(err)) {
      // Retry once with an extended timeout on weak mobile links
      try {
        const retryFresh = await fetchWithTimeout(Math.max(timeoutMs, 45000));
        return { data: retryFresh, fromCache: false, stale: false };
      } catch (retryErr) {
        if (isAbortError(retryErr)) {
          throw new Error("Connection timed out while loading records. Please try again.");
        }
        throw retryErr;
      }
    }
    throw err;
  }
}

function buildMutationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function isLikelyNetworkFailure(err: unknown, response?: Response | null): boolean {
  if (isBrowserOffline()) {
    return true;
  }
  if (response && response.status >= 500) {
    return true;
  }
  if (err instanceof TypeError) {
    return true;
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return true;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("timeout") ||
    msg.includes("aborted")
  );
}

export async function enqueueOfflineMutation(input: {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body: unknown;
  label?: string;
}): Promise<OutboxMutation> {
  const item: OutboxMutation = {
    id: buildMutationId(),
    url: input.url,
    method: input.method ?? "POST",
    body: input.body,
    createdAt: Date.now(),
    label: input.label,
    retries: 0,
    lastError: null,
  };
  await idbPutOutbox(item);
  await notifySyncListeners();
  return item;
}

export interface SubmitWithOfflineFallbackResult<T = unknown> {
  queued: boolean;
  data?: T;
  error?: string;
}

/**
 * Attempts a JSON API mutation with a network timeout; if offline or unreachable,
 * saves cleanly into IndexedDB `jiddah_mutation_outbox` for automatic replay.
 */
export async function submitMutationWithOfflineFallback<T = unknown>(input: {
  url: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  body: unknown;
  label?: string;
  timeoutMs?: number;
}): Promise<SubmitWithOfflineFallbackResult<T>> {
  const method = input.method ?? "POST";
  const timeoutMs = input.timeoutMs ?? 25000;

  if (isBrowserOffline()) {
    await enqueueOfflineMutation({ url: input.url, method, body: input.body, label: input.label });
    return { queued: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input.url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input.body),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as T;
      lastSyncedTimestamp = Date.now();
      lastSyncError = null;
      await notifySyncListeners();
      return { queued: false, data };
    }

    const errJson = await response.json().catch(() => null) as { error?: string } | null;
    const explicitError =
      errJson && typeof errJson.error === "string" && errJson.error.trim().length > 0
        ? errJson.error.trim()
        : null;

    // Only treat transient gateway/proxy outages (502/503/504 without an app error message) as offline queue candidates.
    // Real application/database/RLS 500 errors MUST surface immediately instead of being masked as "Saved locally".
    if (response.status >= 502 && !explicitError) {
      await enqueueOfflineMutation({ url: input.url, method, body: input.body, label: input.label });
      return { queued: true };
    }

    const finalError = explicitError || `Request failed (${response.status})`;
    lastSyncError = finalError;
    await notifySyncListeners();
    return {
      queued: false,
      error: finalError,
    };
  } catch (err) {
    if (isLikelyNetworkFailure(err)) {
      await enqueueOfflineMutation({ url: input.url, method, body: input.body, label: input.label });
      return { queued: true };
    }
    return {
      queued: false,
      error: err instanceof Error ? err.message : "Failed to save changes",
    };
  } finally {
    clearTimeout(timer);
  }
}

export interface FlushOutboxOptions {
  fetcher?: typeof fetch;
}

/**
 * Replays queued outbox mutations sequentially in FIFO order.
 */
export async function flushOfflineOutbox(
  options: FlushOutboxOptions = {}
): Promise<{ synced: number; remaining: number; failed: number }> {
  if (syncInFlight) {
    const remaining = await getPendingOutboxCount();
    return { synced: 0, remaining, failed: 0 };
  }
  if (isBrowserOffline()) {
    const remaining = await getPendingOutboxCount();
    return { synced: 0, remaining, failed: 0 };
  }

  const items = await idbListOutbox();
  if (items.length === 0) {
    lastSyncError = null;
    await notifySyncListeners();
    return { synced: 0, remaining: 0, failed: 0 };
  }

  const runFetch = options.fetcher ?? fetch;
  syncInFlight = true;
  lastSyncError = null;
  await notifySyncListeners();

  let synced = 0;
  let failed = 0;
  let touchedMarks = false;

  try {
    for (const item of items) {
      try {
        const res = await runFetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body),
        });

        if (res.ok) {
          await idbDeleteOutbox(item.id);
          synced += 1;
          if (item.url.includes("marks")) {
            touchedMarks = true;
          }
        } else if (res.status >= 400 && res.status < 500) {
          // Validation / auth conflict cannot auto-resolve via infinite retries; keep error visible or drop after inspection
          const errPayload = await res.json().catch(() => ({}));
          const errMsg = (errPayload as { error?: string }).error || `HTTP ${res.status}`;
          lastSyncError = errMsg;
          await idbPutOutbox({ ...item, retries: item.retries + 1, lastError: errMsg });
          failed += 1;
        } else {
          lastSyncError = `Server returned HTTP ${res.status}`;
          await idbPutOutbox({ ...item, retries: item.retries + 1, lastError: lastSyncError });
          failed += 1;
          break;
        }
      } catch (err) {
        lastSyncError = err instanceof Error ? err.message : "Network error during sync";
        await idbPutOutbox({ ...item, retries: item.retries + 1, lastError: lastSyncError });
        failed += 1;
        break;
      }
    }

    if (synced > 0) {
      lastSyncedTimestamp = Date.now();
      invalidateClientCache();
      if (touchedMarks) {
        broadcastMarksUpdated({ source: "offline-outbox-flush", synced });
      }
    }
  } finally {
    syncInFlight = false;
    await notifySyncListeners();
  }

  const remaining = await getPendingOutboxCount();
  return { synced, remaining, failed };
}

export interface CachedPhoneMarksCandidate {
  enrollment_id: string;
  term_id: string;
  circular_marks: Array<{ subject_id: string; bot_score?: number; mot_score?: number; eot_score?: number }>;
  theology_marks: Array<{ subject_id: string; mot_score?: number; eot_score?: number }>;
  unsyncedScoreCount: number;
}

export interface CachedPhoneMarksSyncResult {
  unsyncedStudents: number;
  unsyncedScores: number;
  pushedStudents: number;
  pushedScores: number;
  failedStudents: number;
  lastError: string | null;
}

async function idbListAllReadCacheEntries(): Promise<ReadCacheEntry[]> {
  const byKey = new Map<string, ReadCacheEntry>();
  for (const [k, v] of memoryReadStore.entries()) {
    byKey.set(k, v);
  }
  if (hasIndexedDb()) {
    try {
      const db = await openOfflineDb();
      const rows = await new Promise<ReadCacheEntry[]>((resolve, reject) => {
        const tx = db.transaction(OFFLINE_READ_STORE, "readonly");
        const store = tx.objectStore(OFFLINE_READ_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as ReadCacheEntry[]) ?? []);
        req.onerror = () => reject(req.error);
      });
      for (const row of rows) {
        if (row && typeof row.key === "string") {
          const existing = byKey.get(row.key);
          if (!existing || (row.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
            byKey.set(row.key, row);
          }
        }
      }
    } catch {
      // Fall back to memory read cache
    }
  }
  return Array.from(byKey.values());
}

function isValidNumericMark(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val) && val >= 0 && val <= 100;
}

/**
 * Compares all locally cached student marks in IndexedDB (`read_cache` + `outbox`)
 * for `termId` against live Postgres (`GET /api/marks?bypass_cache=1`), and optionally
 * pushes any scores missing/`null` on the live server up to `POST /api/marks`.
 */
export async function detectAndSyncCachedPhoneMarks(input: {
  termId: string;
  enrollmentIds?: string[];
  autoPush?: boolean;
  fetcher?: typeof fetch;
}): Promise<CachedPhoneMarksSyncResult> {
  const { termId, enrollmentIds, autoPush = false } = input;
  if (!termId) {
    return { unsyncedStudents: 0, unsyncedScores: 0, pushedStudents: 0, pushedScores: 0, failedStudents: 0, lastError: null };
  }

  const runFetch = input.fetcher ?? fetch;
  const allowedIds = enrollmentIds ? new Set(enrollmentIds) : null;

  type LocalScoreMap = {
    circ: Map<string, { bot_score?: number; mot_score?: number; eot_score?: number }>;
    theo: Map<string, { mot_score?: number; eot_score?: number }>;
    cacheKeys: string[];
  };

  const localByEnrollment = new Map<string, LocalScoreMap>();
  const ensureLocal = (eid: string): LocalScoreMap => {
    let entry = localByEnrollment.get(eid);
    if (!entry) {
      entry = { circ: new Map(), theo: new Map(), cacheKeys: [] };
      localByEnrollment.set(eid, entry);
    }
    return entry;
  };

  // 1) Collect cached GET /api/marks sheets from IndexedDB read_cache
  const readEntries = await idbListAllReadCacheEntries();
  for (const entry of readEntries) {
    if (!entry.key.startsWith("marks_sheet_")) continue;
    const rawKey = entry.key.slice("marks_sheet_".length);
    const sepIdx = rawKey.lastIndexOf(":");
    if (sepIdx <= 0) continue;
    const eid = rawKey.slice(0, sepIdx);
    const tid = rawKey.slice(sepIdx + 1);
    if (tid !== termId) continue;
    if (allowedIds && !allowedIds.has(eid)) continue;

    const payload = entry.data as {
      circular_marks?: Array<{ subject_id?: string; bot_score?: number | null; mot_score?: number | null; eot_score?: number | null }>;
      theology_marks?: Array<{ subject_id?: string; mot_score?: number | null; eot_score?: number | null }>;
    } | null;
    if (!payload) continue;

    const target = ensureLocal(eid);
    target.cacheKeys.push(entry.key);

    if (Array.isArray(payload.circular_marks)) {
      for (const m of payload.circular_marks) {
        if (!m?.subject_id) continue;
        const patch: { bot_score?: number; mot_score?: number; eot_score?: number } = target.circ.get(m.subject_id) ?? {};
        if (isValidNumericMark(m.bot_score)) patch.bot_score = m.bot_score;
        if (isValidNumericMark(m.mot_score)) patch.mot_score = m.mot_score;
        if (isValidNumericMark(m.eot_score)) patch.eot_score = m.eot_score;
        if (patch.bot_score !== undefined || patch.mot_score !== undefined || patch.eot_score !== undefined) {
          target.circ.set(m.subject_id, patch);
        }
      }
    }
    if (Array.isArray(payload.theology_marks)) {
      for (const m of payload.theology_marks) {
        if (!m?.subject_id) continue;
        const patch: { mot_score?: number; eot_score?: number } = target.theo.get(m.subject_id) ?? {};
        if (isValidNumericMark(m.mot_score)) patch.mot_score = m.mot_score;
        if (isValidNumericMark(m.eot_score)) patch.eot_score = m.eot_score;
        if (patch.mot_score !== undefined || patch.eot_score !== undefined) {
          target.theo.set(m.subject_id, patch);
        }
      }
    }
  }

  // 2) Also overlay any outbox mark batches targeting this term
  const outboxItems = await idbListOutbox();
  for (const item of outboxItems) {
    if (!item.url.includes("/api/marks")) continue;
    const body = item.body as {
      enrollment_id?: string;
      term_id?: string;
      circular_marks?: Array<{ subject_id?: string; bot_score?: number | null; mot_score?: number | null; eot_score?: number | null }>;
      theology_marks?: Array<{ subject_id?: string; mot_score?: number | null; eot_score?: number | null }>;
    } | null;
    if (!body?.enrollment_id || body.term_id !== termId) continue;
    if (allowedIds && !allowedIds.has(body.enrollment_id)) continue;

    const target = ensureLocal(body.enrollment_id);
    if (Array.isArray(body.circular_marks)) {
      for (const m of body.circular_marks) {
        if (!m?.subject_id) continue;
        const patch = target.circ.get(m.subject_id) ?? {};
        if (isValidNumericMark(m.bot_score)) patch.bot_score = m.bot_score;
        if (isValidNumericMark(m.mot_score)) patch.mot_score = m.mot_score;
        if (isValidNumericMark(m.eot_score)) patch.eot_score = m.eot_score;
        if (patch.bot_score !== undefined || patch.mot_score !== undefined || patch.eot_score !== undefined) {
          target.circ.set(m.subject_id, patch);
        }
      }
    }
    if (Array.isArray(body.theology_marks)) {
      for (const m of body.theology_marks) {
        if (!m?.subject_id) continue;
        const patch = target.theo.get(m.subject_id) ?? {};
        if (isValidNumericMark(m.mot_score)) patch.mot_score = m.mot_score;
        if (isValidNumericMark(m.eot_score)) patch.eot_score = m.eot_score;
        if (patch.mot_score !== undefined || patch.eot_score !== undefined) {
          target.theo.set(m.subject_id, patch);
        }
      }
    }
  }

  // Keep only enrollments with actual non-null scores
  const candidates = Array.from(localByEnrollment.entries()).filter(
    ([, v]) => v.circ.size > 0 || v.theo.size > 0
  );

  if (candidates.length === 0) {
    return { unsyncedStudents: 0, unsyncedScores: 0, pushedStudents: 0, pushedScores: 0, failedStudents: 0, lastError: null };
  }

  if (isBrowserOffline()) {
    let totalScores = 0;
    for (const [, v] of candidates) {
      for (const p of v.circ.values()) totalScores += Object.keys(p).length;
      for (const p of v.theo.values()) totalScores += Object.keys(p).length;
    }
    return {
      unsyncedStudents: candidates.length,
      unsyncedScores: totalScores,
      pushedStudents: 0,
      pushedScores: 0,
      failedStudents: 0,
      lastError: "Device is offline.",
    };
  }

  // 3) Compare each candidate against live Postgres (?bypass_cache=1) in small chunks
  const diffs: CachedPhoneMarksCandidate[] = [];
  const CHUNK_SIZE = 5;
  let lastError: string | null = null;

  for (let i = 0; i < candidates.length; i += CHUNK_SIZE) {
    const slice = candidates.slice(i, i + CHUNK_SIZE);
    await Promise.all(
      slice.map(async ([eid, local]) => {
        try {
          const res = await runFetch(
            `/api/marks?enrollment_id=${encodeURIComponent(eid)}&term_id=${encodeURIComponent(termId)}&bypass_cache=1`,
            { cache: "no-store" }
          );
          if (!res.ok) return;
          const serverJson = (await res.json()) as {
            circular_marks?: Array<{ subject_id: string; bot_score: number | null; mot_score: number | null; eot_score: number | null }>;
            theology_marks?: Array<{ subject_id: string; mot_score: number | null; eot_score: number | null }>;
          };

          const serverCircBySub = new Map((serverJson.circular_marks ?? []).map((r) => [r.subject_id, r]));
          const serverTheoBySub = new Map((serverJson.theology_marks ?? []).map((r) => [r.subject_id, r]));

          const circDiff: CachedPhoneMarksCandidate["circular_marks"] = [];
          let missingScoreCount = 0;

          for (const [subId, localPatch] of local.circ.entries()) {
            const srv = serverCircBySub.get(subId);
            if (!srv) continue; // Ignore subjects user cannot access
            const subPayload: { subject_id: string; bot_score?: number; mot_score?: number; eot_score?: number } = {
              subject_id: subId,
            };
            if (localPatch.bot_score !== undefined && srv.bot_score == null) {
              subPayload.bot_score = localPatch.bot_score;
              missingScoreCount++;
            }
            if (localPatch.mot_score !== undefined && srv.mot_score == null) {
              subPayload.mot_score = localPatch.mot_score;
              missingScoreCount++;
            }
            if (localPatch.eot_score !== undefined && srv.eot_score == null) {
              subPayload.eot_score = localPatch.eot_score;
              missingScoreCount++;
            }
            if (Object.keys(subPayload).length > 1) {
              circDiff.push(subPayload);
            }
          }

          const theoDiff: CachedPhoneMarksCandidate["theology_marks"] = [];
          for (const [subId, localPatch] of local.theo.entries()) {
            const srv = serverTheoBySub.get(subId);
            if (!srv) continue;
            const subPayload: { subject_id: string; mot_score?: number; eot_score?: number } = {
              subject_id: subId,
            };
            if (localPatch.mot_score !== undefined && srv.mot_score == null) {
              subPayload.mot_score = localPatch.mot_score;
              missingScoreCount++;
            }
            if (localPatch.eot_score !== undefined && srv.eot_score == null) {
              subPayload.eot_score = localPatch.eot_score;
              missingScoreCount++;
            }
            if (Object.keys(subPayload).length > 1) {
              theoDiff.push(subPayload);
            }
          }

          if (missingScoreCount > 0) {
            diffs.push({
              enrollment_id: eid,
              term_id: termId,
              circular_marks: circDiff,
              theology_marks: theoDiff,
              unsyncedScoreCount: missingScoreCount,
            });
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Cache check failed";
        }
      })
    );
  }

  const totalUnsyncedScores = diffs.reduce((s, d) => s + d.unsyncedScoreCount, 0);
  if (!autoPush || diffs.length === 0) {
    return {
      unsyncedStudents: diffs.length,
      unsyncedScores: totalUnsyncedScores,
      pushedStudents: 0,
      pushedScores: 0,
      failedStudents: 0,
      lastError,
    };
  }

  // 4) Batch-push diffs cleanly to POST /api/marks
  let pushedStudents = 0;
  let pushedScores = 0;
  let failedStudents = 0;

  for (let i = 0; i < diffs.length; i += 3) {
    const slice = diffs.slice(i, i + 3);
    await Promise.all(
      slice.map(async (item) => {
        try {
          const res = await runFetch("/api/marks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enrollment_id: item.enrollment_id,
              term_id: item.term_id,
              score_type: "all",
              circular_marks: item.circular_marks,
              theology_marks: item.theology_marks,
            }),
          });
          if (res.ok) {
            pushedStudents++;
            pushedScores += item.unsyncedScoreCount;
          } else {
            const errJson = (await res.json().catch(() => ({}))) as { error?: string };
            lastError = errJson.error || `HTTP ${res.status}`;
            failedStudents++;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : "Failed to push cached marks";
          failedStudents++;
        }
      })
    );
  }

  if (pushedStudents > 0) {
    lastSyncedTimestamp = Date.now();
    invalidateClientCache();
    broadcastMarksUpdated({ source: "phone-cache-recovery", pushedStudents, pushedScores });
    await notifySyncListeners();
  }

  return {
    unsyncedStudents: Math.max(0, diffs.length - pushedStudents),
    unsyncedScores: Math.max(0, totalUnsyncedScores - pushedScores),
    pushedStudents,
    pushedScores,
    failedStudents,
    lastError,
  };
}
