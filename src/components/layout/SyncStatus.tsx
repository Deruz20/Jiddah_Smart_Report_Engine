'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="flex items-center gap-3 text-sm bg-white/50 backdrop-blur-sm border rounded-full px-4 py-1.5 shadow-sm">
      {/* Status Icon & Label */}
      <div className="flex items-center gap-2">
        {state === 'synced' && (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-medium text-slate-700">Synced</span>
          </>
        )}
        
        {state === 'pending' && (
          <>
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-slate-700">
              {pendingCount} Pending
            </span>
          </>
        )}

        {state === 'syncing' && (
          <>
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="font-medium text-slate-700">Syncing...</span>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="font-medium text-red-600">Action Required</span>
            {onResolveError && (
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-red-600 underline"
                onClick={onResolveError}
              >
                Resolve
              </Button>
            )}
          </>
        )}
      </div>

      <div className="w-px h-4 bg-slate-200" />

      {/* Last Synced Time */}
      <div className="text-slate-500 text-xs flex items-center gap-2">
        <span>Last updated: {formatTime(lastSyncedAt)}</span>
      </div>

      {/* Manual Sync Button */}
      {state !== 'syncing' && state !== 'error' && (
        <>
          <div className="w-px h-4 bg-slate-200" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 rounded-full text-slate-500 hover:text-slate-900"
            onClick={handleSync}
            disabled={isManualSyncing || state === 'syncing'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isManualSyncing ? 'animate-spin' : ''}`} />
            <span className="sr-only">Sync Now</span>
          </Button>
        </>
      )}
    </div>
  )
}
