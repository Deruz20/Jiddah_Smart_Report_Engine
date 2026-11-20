"use client";

import { openDB, type IDBPDatabase } from "idb";
import { invalidateClientCache } from "./client-cache";

export const OFFLINE_CACHE_DB = "jiddah_cache_v2";
export const OFFLINE_READ_STORE = "read_cache";
export const OFFLINE_OUTBOX_STORE = "jiddah_mutation_outbox";
export const OFFLINE_DLQ_STORE = "jiddah_dead_letter_queue";
export const OFFLINE_CONFLICTS_STORE = "jiddah_sync_conflicts";
export const OFFLINE_SYNC_EVENT = "jiddah:offline-sync-changed";
export const MARKS_UPDATED_EVENT = "jiddah:marks-updated";

export interface OutboxMutation {
  id: string;
  url: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  mutation_type?: string;
  body: unknown;
  payload?: unknown;
  timestamp: number;
  createdAt: number;
  base_server_updated_at?: string | number | null;
  version_hash?: string;
  entity_type?: "circular_marks" | "theology_marks" | "students" | "attendance" | string;
  entity_id?: string;
  label?: string;
  retries: number;
  lastError?: string | null;
  status?: "pending" | "syncing" | "conflict" | "dlq";
}

export interface SyncConflict {
  id: string; // mutation id
  mutation: OutboxMutation;
  entity_type: string;
  entity_id: string;
  local_data: any;
  server_data: any;
  local_timestamp: number;
  server_updated_at: string;
  flagged_at: number;
  status: "unresolved" | "resolved";
}

interface ReadCacheEntry<T = unknown> {
  key: string;
  data: T;
  updatedAt: number;
}

export interface OfflineSyncStatusSnapshot {
  pendingCount: number;
  dlqCount: number;
  conflictCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastError: string | null;
  lastSyncedAt: number | null;
}

// Fallback memory stores when running in restricted/non-IndexedDB environments (SSR/Node tests)
const memoryReadStore = new Map<string, ReadCacheEntry>();
const memoryOutboxStore = new Map<string, OutboxMutation>();
const memoryDlqStore = new Map<string, OutboxMutation>();
const memoryConflictStore = new Map<string, SyncConflict>();

const pendingIdbWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();
const recentRevalidateAt = new Map<string, number>();
const REVALIDATE_COOLDOWN_MS = 30000;
let cachedDbPromise: Promise<IDBPDatabase<any>> | null = null;

let syncInFlight = false;
let lastSyncError: string | null = null;
let lastSyncedTimestamp: number | null = null;

export function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

export function computeVersionHash(data: unknown): string {
  try {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return "v_" + Math.abs(hash).toString(16);
  } catch {
    return "v_" + Date.now().toString(16);
  }
}

/**
 * Initializes and manages the IndexedDB connection with upgraded object stores.
 */
function openOfflineDb(): Promise<IDBPDatabase<any>> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!cachedDbPromise) {
    cachedDbPromise = openDB(OFFLINE_CACHE_DB, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(OFFLINE_READ_STORE)) {
          db.createObjectStore(OFFLINE_READ_STORE, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(OFFLINE_OUTBOX_STORE)) {
          db.createObjectStore(OFFLINE_OUTBOX_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(OFFLINE_DLQ_STORE)) {
          db.createObjectStore(OFFLINE_DLQ_STORE, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(OFFLINE_CONFLICTS_STORE)) {
          db.createObjectStore(OFFLINE_CONFLICTS_STORE, { keyPath: "id" });
        }
      },
      blocked() {
        console.warn("IndexedDB upgrade blocked by another active tab");
      },
      blocking() {
        if (cachedDbPromise) {
          cachedDbPromise.then((db) => db.close());
          cachedDbPromise = null;
        }
      },
      terminated() {
        cachedDbPromise = null;
      },
    });
  }
  return cachedDbPromise;
}

// ---------------------------------------------------------------------------
// Read Cache Accessors
// ---------------------------------------------------------------------------

async function idbGetReadCache<T>(key: string): Promise<ReadCacheEntry<T> | null> {
  const memHit = memoryReadStore.get(key) as ReadCacheEntry<T> | undefined;
  if (memHit) return memHit;
  if (!hasIndexedDb()) {
    return null;
  }
  try {
    const db = await openOfflineDb();
    const res = (await db.get(OFFLINE_READ_STORE, key)) as ReadCacheEntry<T> | undefined;
    if (res) memoryReadStore.set(key, res);
    return res ?? null;
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
      await db.put(OFFLINE_READ_STORE, latest);
    } catch {
      // Non-fatal cache write failure
    }
  }, 250);
  pendingIdbWriteTimers.set(key, timer);
}

// ---------------------------------------------------------------------------
// Outbox (Queue) Operations
// ---------------------------------------------------------------------------

async function idbListOutbox(): Promise<OutboxMutation[]> {
  if (!hasIndexedDb()) {
    return Array.from(memoryOutboxStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
  try {
    const db = await openOfflineDb();
    const rows = (await db.getAll(OFFLINE_OUTBOX_STORE)) as OutboxMutation[];
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
    await db.put(OFFLINE_OUTBOX_STORE, item);
  } catch {
    // Keep in-memory backup if IDB quota exceeded
  }
}

async function idbDeleteOutbox(id: string): Promise<void> {
  memoryOutboxStore.delete(id);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await db.delete(OFFLINE_OUTBOX_STORE, id);
  } catch {
    // Ignore delete error
  }
}

// ---------------------------------------------------------------------------
// Dead-Letter Queue (DLQ) Operations
// ---------------------------------------------------------------------------

async function idbListDlq(): Promise<OutboxMutation[]> {
  if (!hasIndexedDb()) {
    return Array.from(memoryDlqStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
  try {
    const db = await openOfflineDb();
    const rows = (await db.getAll(OFFLINE_DLQ_STORE)) as OutboxMutation[];
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return Array.from(memoryDlqStore.values()).sort((a, b) => a.createdAt - b.createdAt);
  }
}

async function idbPutDlq(item: OutboxMutation): Promise<void> {
  item.status = "dlq";
  memoryDlqStore.set(item.id, item);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await db.put(OFFLINE_DLQ_STORE, item);
  } catch {
    // Keep in-memory
  }
}

async function idbDeleteDlq(id: string): Promise<void> {
  memoryDlqStore.delete(id);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await db.delete(OFFLINE_DLQ_STORE, id);
  } catch {
    // Ignore
  }
}

export async function getDeadLetterQueue(): Promise<OutboxMutation[]> {
  return idbListDlq();
}

export async function getDeadLetterQueueCount(): Promise<number> {
  const items = await idbListDlq();
  return items.length;
}

export async function retryDlqItem(id: string): Promise<boolean> {
  const items = await idbListDlq();
  const item = items.find((i) => i.id === id);
  if (!item) return false;

  await idbDeleteDlq(id);
  item.status = "pending";
  item.retries = 0;
  item.lastError = null;
  await idbPutOutbox(item);
  await notifySyncListeners();
  return true;
}

export async function discardDlqItem(id: string): Promise<boolean> {
  await idbDeleteDlq(id);
  await notifySyncListeners();
  return true;
}

export async function clearDeadLetterQueue(): Promise<void> {
  memoryDlqStore.clear();
  if (hasIndexedDb()) {
    try {
      const db = await openOfflineDb();
      await db.clear(OFFLINE_DLQ_STORE);
    } catch {
      // Ignore
    }
  }
  await notifySyncListeners();
}

// ---------------------------------------------------------------------------
// Conflict Resolution Store Operations
// ---------------------------------------------------------------------------

async function idbListConflicts(): Promise<SyncConflict[]> {
  if (!hasIndexedDb()) {
    return Array.from(memoryConflictStore.values()).sort((a, b) => a.flagged_at - b.flagged_at);
  }
  try {
    const db = await openOfflineDb();
    const rows = (await db.getAll(OFFLINE_CONFLICTS_STORE)) as SyncConflict[];
    return rows.sort((a, b) => a.flagged_at - b.flagged_at);
  } catch {
    return Array.from(memoryConflictStore.values()).sort((a, b) => a.flagged_at - b.flagged_at);
  }
}

async function idbPutConflict(conflict: SyncConflict): Promise<void> {
  memoryConflictStore.set(conflict.id, conflict);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await db.put(OFFLINE_CONFLICTS_STORE, conflict);
  } catch {
    // Keep in-memory
  }
}

async function idbDeleteConflict(id: string): Promise<void> {
  memoryConflictStore.delete(id);
  if (!hasIndexedDb()) return;
  try {
    const db = await openOfflineDb();
    await db.delete(OFFLINE_CONFLICTS_STORE, id);
  } catch {
    // Ignore
  }
}

export async function getSyncConflicts(): Promise<SyncConflict[]> {
  return idbListConflicts();
}

export async function getSyncConflictCount(): Promise<number> {
  const items = await idbListConflicts();
  return items.length;
}

export async function flagSyncConflict(conflict: SyncConflict): Promise<void> {
  await idbPutConflict(conflict);
  await notifySyncListeners();
}

export async function clearSyncConflicts(): Promise<void> {
  memoryConflictStore.clear();
  if (hasIndexedDb()) {
    try {
      const db = await openOfflineDb();
      await db.clear(OFFLINE_CONFLICTS_STORE);
    } catch {
      // Ignore
    }
  }
  await notifySyncListeners();
}

/**
 * Resolves a flagged sync conflict by either discarding local changes (Keep Server)
 * or force-pushing local changes (Overwrite With Mine).
 */
export async function resolveSyncConflict(
  conflictId: string,
  choice: "keep_server" | "overwrite_with_mine",
  options: { fetcher?: typeof fetch } = {}
): Promise<void> {
  const conflicts = await getSyncConflicts();
  const conflict = conflicts.find((c) => c.id === conflictId);
  if (!conflict) return;

  const runFetch = options.fetcher ?? fetch;

  if (choice === "keep_server") {
    // Discard local offline mutation and remove from conflict store
    await idbDeleteConflict(conflictId);
    invalidateClientCache();
    broadcastMarksUpdated({ source: "conflict-resolved-keep-server", conflictId });
  } else if (choice === "overwrite_with_mine") {
    // Force push local data to the server with conflict override header
    try {
      const mutation = conflict.mutation;
      const res = await runFetch(mutation.url, {
        method: mutation.method,
        headers: {
          "Content-Type": "application/json",
          "x-conflict-override": "true",
          "x-client-timestamp": String(mutation.timestamp),
        },
        body: JSON.stringify(mutation.body ?? mutation.payload),
      });

      if (!res.ok) {
        throw new Error(`Failed to overwrite server record: HTTP ${res.status}`);
      }

      await idbDeleteConflict(conflictId);
      lastSyncedTimestamp = Date.now();
      invalidateClientCache();
      broadcastMarksUpdated({ source: "conflict-resolved-overwrite", conflictId });
    } catch (err: any) {
      lastSyncError = err instanceof Error ? err.message : "Failed to force overwrite";
      throw err;
    }
  }

  await notifySyncListeners();
}

/**
 * Resolves all active conflicts with a single resolution strategy.
 */
export async function resolveAllConflicts(
  choice: "keep_server" | "overwrite_with_mine",
  options: { fetcher?: typeof fetch } = {}
): Promise<void> {
  const conflicts = await getSyncConflicts();
  for (const c of conflicts) {
    await resolveSyncConflict(c.id, choice, options);
  }
}

// ---------------------------------------------------------------------------
// Global Status, Cleanups & Listeners
// ---------------------------------------------------------------------------

export async function clearOfflineCaches(): Promise<void> {
  memoryReadStore.clear();
  memoryOutboxStore.clear();
  memoryDlqStore.clear();
  memoryConflictStore.clear();
  invalidateClientCache();
  if (!hasIndexedDb()) {
    await notifySyncListeners();
    return;
  }
  try {
    const db = await openOfflineDb();
    await Promise.all([
      db.clear(OFFLINE_READ_STORE).catch(() => {}),
      db.clear(OFFLINE_OUTBOX_STORE).catch(() => {}),
      db.clear(OFFLINE_DLQ_STORE).catch(() => {}),
      db.clear(OFFLINE_CONFLICTS_STORE).catch(() => {}),
    ]);
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

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export async function getOfflineSyncStatus(): Promise<OfflineSyncStatusSnapshot> {
  const pendingCount = await getPendingOutboxCount();
  const dlqCount = await getDeadLetterQueueCount();
  const conflictCount = await getSyncConflictCount();
  const isOnline = !isBrowserOffline();
  return {
    pendingCount,
    dlqCount,
    conflictCount,
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
 * Stale-While-Revalidate JSON fetcher backed by IndexedDB.
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
  mutation_type?: string;
  body: unknown;
  payload?: unknown;
  base_server_updated_at?: string | number | null;
  entity_type?: "circular_marks" | "theology_marks" | "students" | "attendance" | string;
  entity_id?: string;
  label?: string;
}): Promise<OutboxMutation> {
  const payload = input.payload ?? input.body;
  const mutationType =
    input.mutation_type ||
    (input.url.includes("marks")
      ? "marks:save"
      : input.url.includes("attendance")
      ? "attendance:save"
      : input.url.includes("students")
      ? "students:update"
      : "generic:mutation");

  const item: OutboxMutation = {
    id: buildMutationId(),
    url: input.url,
    method: input.method ?? "POST",
    mutation_type: mutationType,
    body: payload,
    payload,
    timestamp: Date.now(),
    createdAt: Date.now(),
    base_server_updated_at: input.base_server_updated_at ?? null,
    version_hash: computeVersionHash(payload),
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    label: input.label,
    retries: 0,
    lastError: null,
    status: "pending",
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
  mutation_type?: string;
  body: unknown;
  payload?: unknown;
  base_server_updated_at?: string | number | null;
  entity_type?: "circular_marks" | "theology_marks" | "students" | "attendance" | string;
  entity_id?: string;
  label?: string;
  timeoutMs?: number;
}): Promise<SubmitWithOfflineFallbackResult<T>> {
  const method = input.method ?? "POST";
  const timeoutMs = input.timeoutMs ?? 25000;
  const payload = input.payload ?? input.body;

  if (isBrowserOffline()) {
    await enqueueOfflineMutation({
      url: input.url,
      method,
      mutation_type: input.mutation_type,
      body: payload,
      payload,
      base_server_updated_at: input.base_server_updated_at,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      label: input.label,
    });
    return { queued: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input.url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(input.base_server_updated_at
          ? { "x-base-server-timestamp": String(input.base_server_updated_at) }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (response.ok) {
      const data = (await response.json().catch(() => ({}))) as T;
      lastSyncedTimestamp = Date.now();
      lastSyncError = null;
      await notifySyncListeners();
      return { queued: false, data };
    }

    const errJson = (await response.json().catch(() => null)) as {
      error?: string;
      server_data?: any;
      server_updated_at?: string;
    } | null;

    const explicitError =
      errJson && typeof errJson.error === "string" && errJson.error.trim().length > 0
        ? errJson.error.trim()
        : null;

    // Direct 409 conflict detection from API
    if (response.status === 409) {
      const conflictId = buildMutationId();
      await flagSyncConflict({
        id: conflictId,
        mutation: {
          id: conflictId,
          url: input.url,
          method,
          body: payload,
          payload,
          timestamp: Date.now(),
          createdAt: Date.now(),
          base_server_updated_at: input.base_server_updated_at,
          version_hash: computeVersionHash(payload),
          entity_type: input.entity_type,
          entity_id: input.entity_id,
          label: input.label,
          retries: 0,
          status: "conflict",
        },
        entity_type: input.entity_type || "generic",
        entity_id: input.entity_id || conflictId,
        local_data: payload,
        server_data: errJson?.server_data || null,
        local_timestamp: Date.now(),
        server_updated_at: errJson?.server_updated_at || new Date().toISOString(),
        flagged_at: Date.now(),
        status: "unresolved",
      });
      return { queued: false, error: "Sync conflict detected with server data." };
    }

    // Only treat transient gateway/proxy outages (502/503/504 without an app error message) as offline queue candidates.
    if (response.status >= 502 && !explicitError) {
      await enqueueOfflineMutation({
        url: input.url,
        method,
        mutation_type: input.mutation_type,
        body: payload,
        payload,
        base_server_updated_at: input.base_server_updated_at,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        label: input.label,
      });
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
      await enqueueOfflineMutation({
        url: input.url,
        method,
        mutation_type: input.mutation_type,
        body: payload,
        payload,
        base_server_updated_at: input.base_server_updated_at,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        label: input.label,
      });
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
 * Replays queued outbox mutations with conflict verification and Dead-Letter Queue (DLQ) routing.
 * 4xx client errors are moved to DLQ so other items continue syncing.
 * Timestamp conflicts are flagged into `jiddah_sync_conflicts` for teacher resolution.
 */
export async function flushOfflineOutbox(
  options: FlushOutboxOptions = {}
): Promise<{ synced: number; remaining: number; failed: number; conflicts: number; dlqCount: number }> {
  if (syncInFlight) {
    const remaining = await getPendingOutboxCount();
    const dlqCount = await getDeadLetterQueueCount();
    const conflicts = await getSyncConflictCount();
    return { synced: 0, remaining, failed: 0, conflicts, dlqCount };
  }
  if (isBrowserOffline()) {
    const remaining = await getPendingOutboxCount();
    const dlqCount = await getDeadLetterQueueCount();
    const conflicts = await getSyncConflictCount();
    return { synced: 0, remaining, failed: 0, conflicts, dlqCount };
  }

  const items = await idbListOutbox();
  if (items.length === 0) {
    lastSyncError = null;
    await notifySyncListeners();
    const dlqCount = await getDeadLetterQueueCount();
    const conflicts = await getSyncConflictCount();
    return { synced: 0, remaining: 0, failed: 0, conflicts, dlqCount };
  }

  const runFetch = options.fetcher ?? fetch;
  syncInFlight = true;
  lastSyncError = null;
  await notifySyncListeners();

  let synced = 0;
  let failed = 0;
  let conflictCount = 0;
  let touchedMarks = false;

  try {
    for (const item of items) {
      try {
        // 1. Conflict Check: Validate timestamps before blindly overwriting
        if (item.entity_id && item.base_server_updated_at && item.entity_type) {
          try {
            const valRes = await runFetch("/api/sync/validate-timestamps", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: [
                  {
                    id: item.id,
                    entity_type: item.entity_type,
                    entity_id: item.entity_id,
                    client_timestamp: item.timestamp || item.createdAt,
                    base_timestamp: item.base_server_updated_at,
                  },
                ],
              }),
            });

            if (valRes.ok) {
              const valJson = await valRes.json();
              const match = valJson.validations?.[0];
              if (match && match.has_conflict) {
                // Isolate conflict to jiddah_sync_conflicts
                await flagSyncConflict({
                  id: item.id,
                  mutation: item,
                  entity_type: item.entity_type,
                  entity_id: item.entity_id,
                  local_data: item.payload ?? item.body,
                  server_data: match.server_data,
                  local_timestamp: item.timestamp || item.createdAt,
                  server_updated_at: match.server_updated_at,
                  flagged_at: Date.now(),
                  status: "unresolved",
                });
                await idbDeleteOutbox(item.id);
                conflictCount += 1;
                continue; // Do not replay this conflicting item
              }
            }
          } catch {
            // If validation check fails due to network, attempt direct replay
          }
        }

        // 2. Perform the mutation
        const res = await runFetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            "x-version-hash": item.version_hash || computeVersionHash(item.body),
          },
          body: JSON.stringify(item.body ?? item.payload),
        });

        if (res.ok) {
          await idbDeleteOutbox(item.id);
          synced += 1;
          if (item.url.includes("marks")) {
            touchedMarks = true;
          }
        } else if (res.status === 409) {
          // 409 Conflict from server
          const conflictData = await res.json().catch(() => ({}));
          await flagSyncConflict({
            id: item.id,
            mutation: item,
            entity_type: item.entity_type || "generic",
            entity_id: item.entity_id || item.id,
            local_data: item.payload ?? item.body,
            server_data: conflictData.server_data || conflictData,
            local_timestamp: item.timestamp || item.createdAt,
            server_updated_at: conflictData.server_updated_at || new Date().toISOString(),
            flagged_at: Date.now(),
            status: "unresolved",
          });
          await idbDeleteOutbox(item.id);
          conflictCount += 1;
        } else if (res.status >= 400 && res.status < 500) {
          // 4xx Client / Auth / Validation error: Move to Dead-Letter Queue (DLQ)!
          // Must not block the rest of the queue.
          const errPayload = await res.json().catch(() => ({}));
          const errMsg = (errPayload as { error?: string }).error || `HTTP ${res.status}`;
          lastSyncError = errMsg;

          const dlqItem: OutboxMutation = {
            ...item,
            retries: item.retries + 1,
            lastError: errMsg,
            status: "dlq",
          };
          await idbPutDlq(dlqItem);
          await idbDeleteOutbox(item.id);
          failed += 1;
          // Continue to next mutation!
        } else {
          // 5xx Server error: Transient failure. Retain in outbox for subsequent retry.
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
  const dlqCount = await getDeadLetterQueueCount();
  const conflicts = await getSyncConflictCount();
  return { synced, remaining, failed, conflicts, dlqCount };
}

// ---------------------------------------------------------------------------
// Cached Phone Marks Reconciliation & Push
// ---------------------------------------------------------------------------

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
      const rows = (await db.getAll(OFFLINE_READ_STORE)) as ReadCacheEntry[];
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

  // 1) Read cache scanning
  const readEntries = await idbListAllReadCacheEntries();
  for (const entry of readEntries) {
    if (!entry.key || typeof entry.key !== "string") continue;
    if (!entry.key.startsWith("/api/marks?")) continue;

    const [pathname, search] = entry.key.split("?");
    if (pathname !== "/api/marks" || !search) continue;

    const params = new URLSearchParams(search);
    const eid = params.get("enrollment_id");
    const tId = params.get("term_id");

    if (!eid || !tId || tId !== termId) continue;
    if (allowedIds && !allowedIds.has(eid)) continue;

    const data = (entry.data as { data?: any })?.data ?? entry.data;
    if (!data || typeof data !== "object") continue;

    const local = ensureLocal(eid);
    local.cacheKeys.push(entry.key);

    const circList = Array.isArray(data.circular_marks) ? data.circular_marks : [];
    for (const row of circList) {
      if (!row || !row.subject_id) continue;
      const subId = String(row.subject_id);
      const patch = local.circ.get(subId) ?? {};
      if (typeof row.bot_score === "number") patch.bot_score = row.bot_score;
      if (typeof row.mot_score === "number") patch.mot_score = row.mot_score;
      if (typeof row.eot_score === "number") patch.eot_score = row.eot_score;
      if (Object.keys(patch).length > 0) local.circ.set(subId, patch);
    }

    const theoList = Array.isArray(data.theology_marks) ? data.theology_marks : [];
    for (const row of theoList) {
      if (!row || !row.subject_id) continue;
      const subId = String(row.subject_id);
      const patch = local.theo.get(subId) ?? {};
      if (typeof row.mot_score === "number") patch.mot_score = row.mot_score;
      if (typeof row.eot_score === "number") patch.eot_score = row.eot_score;
      if (Object.keys(patch).length > 0) local.theo.set(subId, patch);
    }
  }

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

  // 2) Compare candidates against live Postgres
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
            if (!srv) continue;
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

  // 3) Push missing marks to POST /api/marks
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
