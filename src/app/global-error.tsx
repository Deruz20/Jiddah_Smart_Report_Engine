'use client'
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 dark:bg-slate-900">
        <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Fatal System Error
          </h2>
          <p className="mb-8 max-w-md text-sm text-slate-500 dark:text-slate-400">
            A critical error occurred that could not be recovered. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </body>
    </html>
  )
}
