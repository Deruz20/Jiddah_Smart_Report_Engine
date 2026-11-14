"use client";

import React, { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { applyDeviceTierToDom, DeviceTier } from "@/lib/device-tier";
import {
  clearOfflineCaches,
  flushOfflineOutbox,
  getOfflineSyncStatus,
  OFFLINE_SYNC_EVENT,
  OfflineSyncStatusSnapshot,
} from "@/lib/offline-sync";

export interface OfflineRuntimeState extends OfflineSyncStatusSnapshot {
  deviceTier: DeviceTier;
  isConnected: boolean;
  isFallbackToSupabase: boolean;
  isInitialized: boolean;
}

const defaultState: OfflineRuntimeState = {
  pendingCount: 0,
  isOnline: true,
  isSyncing: false,
  lastError: null,
  lastSyncedAt: null,
  deviceTier: "high",
  isConnected: true,
  isFallbackToSupabase: true,
  isInitialized: true,
};

const OfflineRuntimeContext = createContext<OfflineRuntimeState>(defaultState);

export function usePowerSyncRuntime() {
  return useContext(OfflineRuntimeContext);
}

export const powerSync = {
  async disconnectAndClear() {
    await clearOfflineCaches();
  },
};

/**
 * Lightweight zero-WASM client runtime provider replacing PowerSync SQLite/WASM.
 * Handles hardware capability tier detection (`data-device-tier="high" | "lite"`)
 * and automatic IndexedDB outbox replay whenever network connectivity returns.
 */
export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const [runtimeState, setRuntimeState] = useState<OfflineRuntimeState>(defaultState);

  useEffect(() => {
    let active = true;
    const tier = applyDeviceTierToDom();

    const refreshSnapshot = async () => {
      const snap = await getOfflineSyncStatus();
      if (!active) return;
      setRuntimeState((prev) => ({
        ...prev,
        ...snap,
        deviceTier: tier,
        isConnected: snap.isOnline,
      }));
    };

    refreshSnapshot();

    if (typeof navigator === "undefined" || navigator.onLine) {
      flushOfflineOutbox().catch(() => {});
    }

    const handleOnline = () => {
      flushOfflineOutbox()
        .catch(() => {})
        .finally(() => {
          refreshSnapshot();
        });
    };

    const handleOffline = () => {
      refreshSnapshot();
    };

    const handleSyncChanged = (event: Event) => {
      const custom = event as CustomEvent<OfflineSyncStatusSnapshot>;
      if (custom.detail && active) {
        setRuntimeState((prev) => ({
          ...prev,
          ...custom.detail,
          isConnected: custom.detail.isOnline,
        }));
      } else {
        refreshSnapshot();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_SYNC_EVENT, handleSyncChanged);

    return () => {
      active = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleSyncChanged);
    };
  }, []);

  return (
    <OfflineRuntimeContext.Provider value={runtimeState}>
      {children}
    </OfflineRuntimeContext.Provider>
  );
};
