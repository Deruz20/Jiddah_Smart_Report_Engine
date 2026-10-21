export const POWERSYNC_INIT_TIMEOUT_MS = 2000

export interface PowerSyncRuntimeState {
  isConnected: boolean
  isFallbackToSupabase: boolean
  isInitialized: boolean
}

export async function initializePowerSyncNonBlocking(
  client: {
    init: () => Promise<void>
    connect: (connector: any) => Promise<void>
    disconnect?: () => Promise<void>
  },
  connectorInstance: any,
  timeoutMs: number = POWERSYNC_INIT_TIMEOUT_MS
): Promise<{ connected: boolean; fallbackToSupabase: boolean }> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const connectTask = (async () => {
    try {
      // If the connector provides fetchCredentials (e.g. SupabaseConnector),
      // verify credentials and endpoint availability BEFORE starting PowerSync's
      // internal streaming worker. This prevents @powersync/web from entering an
      // infinite "Sync error Error: Not signed in" retry loop when unconfigured or logged out.
      if (connectorInstance && typeof connectorInstance.fetchCredentials === 'function') {
        const creds = await connectorInstance.fetchCredentials()
        if (!creds || !creds.endpoint || !creds.token) {
          await client.disconnect?.().catch(() => {})
          return { connected: false, fallbackToSupabase: true }
        }
      }

      await client.init()
      if (timedOut) {
        await client.disconnect?.().catch(() => {})
        return { connected: false, fallbackToSupabase: true }
      }
      await client.connect(connectorInstance)
      return { connected: true, fallbackToSupabase: false }
    } catch {
      await client.disconnect?.().catch(() => {})
      return { connected: false, fallbackToSupabase: true }
    }
  })()

  const timeoutTask = new Promise<{ connected: boolean; fallbackToSupabase: boolean }>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      client.disconnect?.().catch(() => {})
      resolve({ connected: false, fallbackToSupabase: true })
    }, timeoutMs)
  })

  try {
    return await Promise.race([connectTask, timeoutTask])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
