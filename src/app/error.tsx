'use client' // Error boundaries must be Client Components

import { useEffect } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service securely
    console.error('Unhandled UI Exception:', error)
  }, [error])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 text-center">
      <div className="mb-6 rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-6 ring-1 ring-rose-100 dark:ring-rose-900/50">
        <AlertTriangle className="mx-auto size-12 text-rose-500" strokeWidth={1.5} />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-md text-sm text-slate-500 dark:text-slate-400">
        We've encountered an unexpected error. Our system has logged the issue, and we are working to resolve it.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => reset()}
          className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-5 py-2.5 text-sm font-semibold text-white dark:text-slate-900 shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
        >
          <RefreshCw className="size-4" strokeWidth={2} />
          Try Again
        </button>
        <button
          onClick={() => window.location.href = '/admin'}
          className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <Home className="size-4" strokeWidth={2} />
          Go Home
        </button>
      </div>
    </div>
  )
}
