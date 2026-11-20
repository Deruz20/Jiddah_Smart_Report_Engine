'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal Global Layout Crash:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-100 font-sans">
        <div className="max-w-md rounded-2xl bg-slate-900 p-8 border border-slate-800 shadow-2xl">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/50">
            <svg
              className="size-7"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-white">
            System Failure
          </h1>
          <p className="mb-6 text-sm text-slate-400 leading-relaxed">
            A critical root-level error occurred. The application shell is attempting self-recovery.
          </p>
          {error.digest && (
            <p className="mb-6 font-mono text-xs text-slate-500">
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Restart Application
          </button>
        </div>
      </body>
    </html>
  )
}
