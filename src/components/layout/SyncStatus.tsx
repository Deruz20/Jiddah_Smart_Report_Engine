// @ts-nocheck
'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/figma-ui/ui/button'

export type SyncState = 'synced' | 'pending' | 'error' | 'syncing'

interface SyncStatusProps {
  state: SyncState
  lastSyncedAt?: Date
  pendingCount?: number
  onSyncNow?: () => void
  onResolveError?: () => void
}

export function SyncStatus({ state, lastSyncedAt, pendingCount = 0, onSyncNow, onResolveError }: SyncStatusProps) {
  const [isManualSyncing, setIsManualSyncing] = useState(false)

  const handleSync = async () => {
    if (onSyncNow) {
      setIsManualSyncing(true)
      try {
        await onSyncNow()
      } finally {
        setIsManualSyncing(false)
      }
    }
  }

  const formatTime = (date?: Date) => {
    if (!date) return 'Never'
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(date)
  }

  return (
    <div className="flex items-center gap-1.5 text-xs bg-white/80 backdrop-blur-sm border border-stone-200/80 rounded-full px-2 sm:px-2.5 py-1 shadow-xs shrink-0">
      {/* Status Icon & Label */}
      <div className="flex items-center gap-1.5">
        {state === 'synced' && (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-stone-700 hidden xl:inline">Synced</span>
          </>
        )}

        {state === 'pending' && (
          <>
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="font-semibold text-stone-700 hidden sm:inline tabular-nums">
              {pendingCount} Pending
            </span>
          </>
        )}

        {state === 'syncing' && (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin shrink-0" />
            <span className="font-semibold text-stone-700 hidden xl:inline">Syncing...</span>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-semibold text-rose-600 hidden sm:inline">Action Required</span>
            {onResolveError && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-rose-600 underline text-xs"
                onClick={onResolveError}
              >
                Resolve
              </Button>
            )}
          </>
        )}
      </div>

      {/* Last Synced Time — only on ultra-wide 2xl screens so it never crowds medium desktop topbars */}
      <div className="hidden 2xl:flex text-stone-500 text-[11px] items-center gap-1.5 pl-1.5 border-l border-stone-200 tabular-nums">
        <span>{formatTime(lastSyncedAt)}</span>
      </div>

      {/* Manual Sync Button */}
      {state !== 'syncing' && state !== 'error' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 rounded-full text-stone-500 hover:text-stone-900 hidden sm:inline-flex items-center justify-center"
          onClick={handleSync}
          disabled={isManualSyncing || state === 'syncing'}
          title={`Last synced: ${formatTime(lastSyncedAt)} — Click to sync`}
        >
          <RefreshCw className={`w-3 h-3 ${isManualSyncing ? 'animate-spin' : ''}`} />
          <span className="sr-only">Sync Now</span>
        </Button>
      )}
    </div>
  )
}
