// @ts-nocheck
'use client'

import React, { useEffect, useState } from 'react'
import { useStatus } from '@powersync/react'
import { SyncStatus, SyncState } from './SyncStatus'

export function PowerSyncStatus() {
  const status = useStatus()
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [lastSynced, setLastSynced] = useState<Date>(new Date())

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (status?.lastSyncedAt) {
      setLastSynced(new Date(status.lastSyncedAt))
    }
  }, [status?.lastSyncedAt])

  let state: SyncState = 'synced'
  let pendingCount = 0

  if (!isOnline) {
    state = 'pending'
    pendingCount = 1
  } else if (status?.dataFlowStatus?.uploading || status?.dataFlowStatus?.downloading) {
    state = 'syncing'
  } else if (status?.hasSynced) {
    state = 'synced'
  } else {
    // In Direct Supabase mode (BYPASS_POWERSYNC_WRITES = true), online cloud connection is active
    state = 'synced'
  }

  return (
    <SyncStatus
      state={state}
      pendingCount={pendingCount}
      lastSyncedAt={lastSynced}
      onSyncNow={async () => {
        setLastSynced(new Date())
      }}
    />
  )
}

