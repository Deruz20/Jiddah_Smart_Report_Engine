'use client'

import { useEffect } from 'react'
import { AlertTriangle, Home, RefreshCw, ShieldAlert } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled Root UI Exception:', error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 ring-1 ring-rose-200/70 dark:ring-rose-800/50">
        <AlertTriangle className="size-8" strokeWidth={2} />
      </div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Application Error Encountered
      </h1>
      <p className="mb-6 max-w-md text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        An unexpected error interrupted this view. Your session and entered data are safe.
      </p>
      {error.digest && (
        <div className="mb-6 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-500 dark:text-slate-400">
          Ref ID: {error.digest}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          aria-label="Try loading this view again"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-slate-100 px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-400"
        >
          <RefreshCw className="size-4" />
          Reload Component
        </button>
        <button
          onClick={() => (window.location.href = '/admin')}
          aria-label="Return to Admin Dashboard"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <Home className="size-4" />
          Dashboard
        </button>
      </div>
    </div>
  )
}
