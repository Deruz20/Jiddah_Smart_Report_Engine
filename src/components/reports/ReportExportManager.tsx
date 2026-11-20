'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  FileArchive,
  RefreshCw,
} from 'lucide-react'
import { usePdfExportJob } from '@/hooks/queries/usePdfExportJobs'

export interface ReportExportManagerProps {
  jobId: string | null
  onClose?: () => void
  onRetry?: () => void
}

export function ReportExportManager({
  jobId,
  onClose,
  onRetry,
}: ReportExportManagerProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const { data: job, isLoading, isError, error, refetch } = usePdfExportJob(jobId)

  if (!jobId) return null

  const status = job?.status || (isLoading ? 'pending' : isError ? 'failed' : 'pending')
  const progressCurrent = job?.progress_current ?? 0
  const progressTotal = job?.progress_total ?? 1
  const percent = Math.min(100, Math.round((progressCurrent / Math.max(1, progressTotal)) * 100))

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] select-none"
      >
        <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 text-slate-100 shadow-2xl backdrop-blur-md">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/60">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <FileArchive className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Batch PDF Engine
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  Job ID: {jobId.slice(0, 8)}...
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMinimized((prev) => !prev)}
                aria-label={isMinimized ? 'Expand export manager' : 'Minimize export manager'}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close export manager"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area (Hidden if Minimized) */}
          {!isMinimized && (
            <div className="p-4 space-y-3.5">
              {/* Status Badge & Counters */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {status === 'pending' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Queued
                    </span>
                  )}
                  {status === 'processing' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400 border border-sky-500/20">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Rendering Reports...
                    </span>
                  )}
                  {status === 'completed' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3" />
                      Archive Ready
                    </span>
                  )}
                  {status === 'failed' && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400 border border-rose-500/20">
                      <AlertCircle className="h-3 w-3" />
                      Generation Failed
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-slate-300">
                  {progressCurrent} / {progressTotal} PDFs
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className={`h-full rounded-full ${
                      status === 'completed'
                        ? 'bg-emerald-500'
                        : status === 'failed'
                        ? 'bg-rose-500'
                        : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Progress</span>
                  <span className="font-mono">{percent}%</span>
                </div>
              </div>

              {/* Error State Details */}
              {status === 'failed' && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-950/30 p-3 text-xs text-rose-200 space-y-2">
                  <p className="font-medium text-rose-300">
                    {job?.error_message || error?.message || 'An error occurred during report generation.'}
                  </p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={() => {
                        onRetry()
                        refetch()
                      }}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-300 hover:text-white underline underline-offset-2 transition"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Retry Generation
                    </button>
                  )}
                </div>
              )}

              {/* Completed Action Button: Strict 44x44px touch target */}
              {status === 'completed' && job?.file_url && (
                <div className="pt-1">
                  <a
                    href={job.file_url}
                    download={job.file_name || `ReportCards_${jobId.slice(0, 8)}.zip`}
                    className="flex h-11 min-h-[44px] min-w-[44px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 hover:bg-emerald-500 active:scale-[0.98] transition cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Archive (.zip)</span>
                  </a>
                </div>
              )}

              {/* Background Status Notice */}
              {(status === 'pending' || status === 'processing') && (
                <p className="text-center text-[10px] text-slate-400">
                  Chromium worker running in background. You can navigate freely.
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
