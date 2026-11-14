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

let syncInFlight = false;
let lastSyncError: string | null = null;
let lastSyncedTimestamp: number | null = null;

function hasIndexedDb(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

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
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
  });
}

async function idbGetReadCache<T>(key: string): Promise<ReadCacheEntry<T> | null> {
  if (!hasIndexedDb()) {
    return (memoryReadStore.get(key) as ReadCacheEntry<T> | undefined) ?? null;
  }
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(OFFLINE_READ_STORE, "readonly");
      const store = tx.objectStore(OFFLINE_READ_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as ReadCacheEntry<T> | undefined) ?? null);
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
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(OFFLINE_READ_STORE, "readwrite");
      const store = tx.objectStore(OFFLINE_READ_STORE);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-fatal cache write failure
  }
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

export interface OfflineFetchOptions {
  timeoutMs?: number;
  cacheKey?: string;
  forceNetwork?: boolean;
  onBackgroundRefresh?: (data: unknown) => void;
}

/**
 * Stale-While-Revalidate JSON fetcher backed by IndexedDB (`jiddah_cache_v1`).
 * Never hangs more than `timeoutMs` (default 4500ms) when internet is weak.
 */
export async function offlineFetchJson<T>(
  url: string,
  options: OfflineFetchOptions = {}
): Promise<{ data: T; fromCache: boolean; stale: boolean }> {
  const cacheKey = options.cacheKey ?? url;
  const timeoutMs = options.timeoutMs ?? 4500;
  const cached = await idbGetReadCache<T>(cacheKey);

  const fetchWithTimeout = async (): Promise<T> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const json = (await response.json()) as T;
      await idbPutReadCache(cacheKey, json);
      return json;
    } finally {
      clearTimeout(timer);
    }
  };

  if (cached && !options.forceNetwork) {
    // Revalidate in background when online
    if (!isBrowserOffline()) {
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
  const timeoutMs = input.timeoutMs ?? 6000;

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

    if (response.status >= 500) {
      await enqueueOfflineMutation({ url: input.url, method, body: input.body, label: input.label });
      return { queued: true };
    }

    const errJson = await response.json().catch(() => ({}));
    return {
      queued: false,
      error: (errJson as { error?: string }).error || `Request failed (${response.status})`,
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
