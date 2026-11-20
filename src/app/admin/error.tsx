'use client'

import { useEffect } from 'react'
import { AlertCircle, RotateCcw, LayoutDashboard, Database } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin Subsystem Exception:', error)
  }, [error])

  const handleClearCacheAndReset = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear()
      }
    } catch {
      // Ignore storage errors
    }
    reset()
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200/80 dark:ring-amber-800/60 shadow-sm">
        <AlertCircle className="size-7" strokeWidth={2} />
      </div>

      <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        Admin Workspace Interrupted
      </h2>
      <p className="mb-6 max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        A render or data synchronization issue occurred in this management module. You can reload this view or reset cached state.
      </p>

      {error.digest && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/80 px-3 py-1 font-mono text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
          <span>Trace:</span>
          <span className="font-semibold">{error.digest}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => reset()}
          aria-label="Retry loading this module"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          <RotateCcw className="size-4" />
          Retry Module
        </button>

        <button
          onClick={handleClearCacheAndReset}
          aria-label="Clear session cache and reload"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <Database className="size-4" />
          Clear Cache &amp; Retry
        </button>

        <button
          onClick={() => (window.location.href = '/admin')}
          aria-label="Return to Dashboard Overview"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"
        >
          <LayoutDashboard className="size-4" />
          Overview
        </button>
      </div>
    </div>
  )
}
