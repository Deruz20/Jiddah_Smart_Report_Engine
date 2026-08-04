'use client'

import React from 'react'
import { usePowerSync, useStatus } from '@powersync/react'
import { SyncStatus, SyncState } from './SyncStatus'

export function PowerSyncStatus() {
  const powerSync = usePowerSync();
  const status = useStatus();

  let state: SyncState = 'synced';
  if (status.dataFlowStatus.uploading || status.dataFlowStatus.downloading) {
    state = 'syncing';
  } else if (!status.connected) {
    state = 'pending';
  } else if (status.dataFlowStatus.error) {
    state = 'error';
  }

  return (
    <SyncStatus
      state={state}
      lastSyncedAt={status.lastSyncedAt || undefined}
      pendingCount={0} // We can derive this if we hook into the queue
      onSyncNow={async () => {
        // Force a sync or reconnect
        if (!status.connected) {
          powerSync.connect(powerSync.currentConnector!);
        }
      }}
    />
  )
}
