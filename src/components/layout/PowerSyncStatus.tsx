"use client";

import React, { useEffect, useState } from "react";
import { SyncStatus, SyncState } from "./SyncStatus";
import { SyncConflictModal } from "@/components/sync/SyncConflictModal";
import {
  flushOfflineOutbox,
  getOfflineSyncStatus,
  OFFLINE_SYNC_EVENT,
  OfflineSyncStatusSnapshot,
} from "@/lib/offline-sync";

export function PowerSyncStatus() {
  const [mounted, setMounted] = useState(false);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [status, setStatus] = useState<OfflineSyncStatusSnapshot>({
    pendingCount: 0,
    dlqCount: 0,
    conflictCount: 0,
    isOnline: true,
    isSyncing: false,
    lastError: null,
    lastSyncedAt: null,
  });

  useEffect(() => {
    setMounted(true);
    let active = true;

    const syncSnapshot = async () => {
      const snap = await getOfflineSyncStatus();
      if (active) setStatus(snap);
    };

    syncSnapshot();

    const handleSyncEvent = (event: Event) => {
      const custom = event as CustomEvent<OfflineSyncStatusSnapshot>;
      if (custom.detail && active) {
        setStatus(custom.detail);
      } else {
        syncSnapshot();
      }
    };

    const handleOnline = () => {
      syncSnapshot();
    };
    const handleOffline = () => {
      syncSnapshot();
    };

    window.addEventListener(OFFLINE_SYNC_EVENT, handleSyncEvent);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      active = false;
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleSyncEvent);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  let state: SyncState = "synced";
  if (status.isSyncing) {
    state = "syncing";
  } else if (status.conflictCount > 0) {
    state = "conflict";
  } else if (status.lastError && status.pendingCount > 0) {
    state = "error";
  } else if (!status.isOnline || status.pendingCount > 0) {
    state = "pending";
  }

  return (
    <>
      <SyncStatus
        state={state}
        pendingCount={status.pendingCount}
        conflictCount={status.conflictCount}
        isOnline={status.isOnline}
        lastSyncedAt={status.lastSyncedAt ? new Date(status.lastSyncedAt) : undefined}
        onSyncNow={async () => {
          await flushOfflineOutbox();
        }}
        onResolveError={async () => {
          await flushOfflineOutbox();
        }}
        onOpenConflicts={() => setIsConflictModalOpen(true)}
      />
      <SyncConflictModal
        open={isConflictModalOpen}
        onOpenChange={setIsConflictModalOpen}
      />
    </>
  );
}
