"use client";

import React, { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, WifiOff, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/figma-ui/ui/button";

export type SyncState = "synced" | "pending" | "error" | "syncing" | "conflict";

interface SyncStatusProps {
  state: SyncState;
  lastSyncedAt?: Date;
  pendingCount?: number;
  conflictCount?: number;
  isOnline?: boolean;
  onSyncNow?: () => void;
  onResolveError?: () => void;
  onOpenConflicts?: () => void;
}

export function SyncStatus({
  state,
  lastSyncedAt,
  pendingCount = 0,
  conflictCount = 0,
  isOnline = true,
  onSyncNow,
  onResolveError,
  onOpenConflicts,
}: SyncStatusProps) {
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  const handleSync = async () => {
    if (onSyncNow) {
      setIsManualSyncing(true);
      try {
        await onSyncNow();
      } finally {
        setIsManualSyncing(false);
      }
    }
  };

  const formatTime = (date?: Date) => {
    if (!date) return "Live";
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div
      className="bg-[#F0F4F9] dark:bg-[#1E1F20] hover:bg-[#E4EAE6] dark:hover:bg-[#282A2C] text-[#444746] dark:text-[#C4C7C5] border-0 rounded-full h-8 px-3 text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer select-none"
      title={
        !isOnline
          ? `Offline Mode (${pendingCount} queued locally)`
          : pendingCount > 0
          ? `${pendingCount} change(s) queued to sync`
          : `Synced (${formatTime(lastSyncedAt)})`
      }
    >
      <div className="flex items-center gap-1.5">
        {state === "synced" && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-[var(--text-primary,#1e293b)] hidden xl:inline">
              Synced
            </span>
          </>
        )}

        {state === "pending" && (
          <>
            {!isOnline ? (
              <WifiOff className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums whitespace-nowrap">
              {!isOnline
                ? `Offline • ${pendingCount} Pending`
                : `${pendingCount} Pending`}
            </span>
          </>
        )}

        {state === "syncing" && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            <span className="font-semibold text-blue-700 dark:text-blue-400 tabular-nums whitespace-nowrap">
              {pendingCount > 0 ? `Syncing ${pendingCount}...` : "Syncing..."}
            </span>
          </>
        )}

        {state === "error" && (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-semibold text-rose-600 tabular-nums whitespace-nowrap">
              {pendingCount > 0 ? `Retry (${pendingCount})` : "Sync Issue"}
            </span>
            {onResolveError && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-rose-600 underline text-xs cursor-pointer"
                onClick={onResolveError}
              >
                Retry
              </Button>
            )}
          </>
        )}

        {state === "conflict" && (
          <button
            type="button"
            onClick={onOpenConflicts}
            className="flex items-center gap-1.5 cursor-pointer outline-none bg-transparent border-0 p-0"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
            <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums whitespace-nowrap hover:underline">
              {conflictCount} Conflict{conflictCount > 1 ? "s" : ""}
            </span>
          </button>
        )}
      </div>

      {state !== "syncing" && state !== "error" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 rounded-full text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hidden sm:inline-flex items-center justify-center"
          onClick={handleSync}
          disabled={isManualSyncing}
          title={
            pendingCount > 0
              ? `Click to flush ${pendingCount} queued change(s)`
              : `Last synced: ${formatTime(lastSyncedAt)} — Click to sync`
          }
        >
          <RefreshCw className={`w-3 h-3 ${isManualSyncing ? "animate-spin" : ""}`} />
          <span className="sr-only">Sync Now</span>
        </Button>
      )}
    </div>
  );
}
