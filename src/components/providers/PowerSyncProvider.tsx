'use client'

import React, { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { PowerSyncDatabase } from '@powersync/web'
import { PowerSyncContext } from '@powersync/react'
import { AppSchema } from '@/lib/powersync/AppSchema'
import { SupabaseConnector } from '@/lib/powersync/SupabaseConnector'
import {
  POWERSYNC_INIT_TIMEOUT_MS,
  PowerSyncRuntimeState,
  initializePowerSyncNonBlocking,
} from '@/lib/powersync/runtime'

export { POWERSYNC_INIT_TIMEOUT_MS, initializePowerSyncNonBlocking }
export type { PowerSyncRuntimeState }

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'jiddah_offline_v1.db',
  },
  flags: {
    disableSSRWarning: true,
    enableMultiTabs: false,
  },
})

export const connector = new SupabaseConnector()

const PowerSyncRuntimeContext = createContext<PowerSyncRuntimeState>({
  isConnected: false,
  isFallbackToSupabase: true,
  isInitialized: true,
})

export function usePowerSyncRuntime() {
  return useContext(PowerSyncRuntimeContext)
}

export const PowerSyncProvider = ({ children }: { children: ReactNode }) => {
  const [runtimeState, setRuntimeState] = useState<PowerSyncRuntimeState>({
    isConnected: false,
    isFallbackToSupabase: true,
    isInitialized: true,
  })

  useEffect(() => {
    let active = true
    const endpoint = process.env.NEXT_PUBLIC_POWERSYNC_URL?.trim()

    // If PowerSync endpoint is not configured, stay in direct Supabase mode immediately
    // without starting any background WebRemote worker or credential polling loop.
    if (!endpoint) {
      return () => {
        active = false
      }
    }

    initializePowerSyncNonBlocking(powerSync, connector, POWERSYNC_INIT_TIMEOUT_MS)
      .then((result) => {
        if (!active) return
        setRuntimeState({
          isConnected: result.connected,
          isFallbackToSupabase: result.fallbackToSupabase,
          isInitialized: true,
        })
      })
      .catch(() => {
        if (!active) return
        setRuntimeState({
          isConnected: false,
          isFallbackToSupabase: true,
          isInitialized: true,
        })
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <PowerSyncRuntimeContext.Provider value={runtimeState}>
      <PowerSyncContext.Provider value={powerSync}>
        {children}
      </PowerSyncContext.Provider>
    </PowerSyncRuntimeContext.Provider>
  )
}
