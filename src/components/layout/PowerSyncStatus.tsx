// @ts-nocheck
'use client'

import React from 'react'
import { SyncStatus } from './SyncStatus'

export function PowerSyncStatus() {
  return (
    <SyncStatus
      state="synced"
      pendingCount={0}
      lastSyncedAt={new Date()}
    />
  )
}
