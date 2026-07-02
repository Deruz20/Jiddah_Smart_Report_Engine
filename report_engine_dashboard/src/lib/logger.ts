function safeSerialize(data: unknown): string {
  try {
    if (typeof data === 'object' && data !== null) {
      // Remove common sensitive keys
      const copy = JSON.parse(JSON.stringify(data, (k, v) => {
        if (k && ['password', 'token', 'access_token', 'refresh_token', 'secret'].includes(k)) return '[REDACTED]'
        return v
      }))
      return JSON.stringify(copy)
    }
    return String(data)
  } catch {
    return String(data)
  }
}

const isDev = import.meta.env.MODE !== 'production'

export const logger = {
  debug: (msg: string, data?: unknown) => {
    if (!isDev) return
    // eslint-disable-next-line no-console
    console.debug(`[debug] ${msg}`, data ? safeSerialize(data) : '')
  },
  info: (msg: string, data?: unknown) => {
    // eslint-disable-next-line no-console
    console.info(`[info] ${msg}`, data ? safeSerialize(data) : '')
  },
  warn: (msg: string, data?: unknown) => {
    // eslint-disable-next-line no-console
    console.warn(`[warn] ${msg}`, data ? safeSerialize(data) : '')
  },
  error: (msg: string, error?: unknown) => {
    // eslint-disable-next-line no-console
    console.error(`[error] ${msg}`, error ? safeSerialize(error) : '')
  },
}
