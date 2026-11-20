'use client'

import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'motion/react'
import {
  AlertTriangle,
  Server,
  Smartphone,
  Check,
  RotateCcw,
  X,
  ArrowRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react'
import {
  getSyncConflicts,
  resolveSyncConflict,
  resolveAllConflicts,
  SyncConflict,
  OFFLINE_SYNC_EVENT,
} from '@/lib/offline-sync'
import { toast } from 'sonner'

export interface SyncConflictModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SyncConflictModal({ open, onOpenChange }: SyncConflictModalProps) {
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [loading, setLoading] = useState(false)
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const loadConflicts = async () => {
    try {
      const items = await getSyncConflicts()
      setConflicts(items)
      if (items.length === 0 && open) {
        onOpenChange(false)
      }
    } catch {
      // Safe ignore
    }
  }

  useEffect(() => {
    if (open) {
      loadConflicts()
    }

    const handleSyncChanged = () => {
      loadConflicts()
    }

    window.addEventListener(OFFLINE_SYNC_EVENT, handleSyncChanged)
    return () => {
      window.removeEventListener(OFFLINE_SYNC_EVENT, handleSyncChanged)
    }
  }, [open])

  const handleResolve = async (
    conflictId: string,
    choice: 'keep_server' | 'overwrite_with_mine'
  ) => {
    setResolvingId(conflictId)
    try {
      await resolveSyncConflict(conflictId, choice)
      toast.success(
        choice === 'keep_server'
          ? 'Kept server version. Local changes discarded.'
          : 'Overwritten server with your offline version.'
      )
      await loadConflicts()
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve conflict.')
    } finally {
      setResolvingId(null)
    }
  }

  const handleResolveAll = async (choice: 'keep_server' | 'overwrite_with_mine') => {
    setLoading(true)
    try {
      await resolveAllConflicts(choice)
      toast.success(
        choice === 'keep_server'
          ? 'Accepted all server versions.'
          : 'Overwritten server with all offline versions.'
      )
      await loadConflicts()
      onOpenChange(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve all conflicts.')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (ts?: string | number | null) => {
    if (!ts) return 'Unknown'
    const date = new Date(ts)
    if (isNaN(date.getTime())) return String(ts)
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date)
  }

  const renderPayloadSummary = (data: any) => {
    if (!data) return <span className="text-slate-500 italic">No record data</span>
    if (typeof data !== 'object') return String(data)

    // Check if marks payload
    if (data.mot_score !== undefined || data.eot_score !== undefined || data.bot_score !== undefined) {
      return (
        <div className="space-y-1 font-mono text-xs">
          {data.bot_score !== undefined && (
            <div>BOT Score: <span className="font-bold text-slate-200">{data.bot_score ?? 'null'}</span></div>
          )}
          {data.mot_score !== undefined && (
            <div>MOT Score: <span className="font-bold text-slate-200">{data.mot_score ?? 'null'}</span></div>
          )}
          {data.eot_score !== undefined && (
            <div>EOT Score: <span className="font-bold text-slate-200">{data.eot_score ?? 'null'}</span></div>
          )}
        </div>
      )
    }

    // Generic display
    return (
      <pre className="max-h-24 overflow-y-auto text-[10px] text-slate-300 font-mono bg-slate-950/60 p-2 rounded-lg">
        {JSON.stringify(data, null, 2)}
      </pre>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl p-0 overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-bold text-slate-100 flex items-center gap-2">
                        <span>Data Synchronization Conflicts</span>
                        <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300 border border-amber-500/30">
                          {conflicts.length}
                        </span>
                      </Dialog.Title>
                      <Dialog.Description className="text-xs text-slate-400 mt-0.5">
                        The live server was updated after your offline edits. Choose which data to keep.
                      </Dialog.Description>
                    </div>
                  </div>

                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close conflict modal"
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Content: List of Conflicts */}
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                  {conflicts.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No active synchronization conflicts. All data is in sync.
                    </div>
                  ) : (
                    conflicts.map((item) => {
                      const isItemResolving = resolvingId === item.id
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div className="text-xs font-semibold text-slate-200">
                              Entity: <span className="text-indigo-400 font-mono">{item.entity_type}</span>
                              <span className="text-slate-500 ml-2 font-mono text-[10px]">({item.entity_id.slice(0, 8)}...)</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Flagged: {formatDateTime(item.flagged_at)}
                            </span>
                          </div>

                          {/* Side-by-Side Comparison */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Server Card */}
                            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs text-sky-400 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <Server className="h-3.5 w-3.5" />
                                  Server Data (Live)
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Server Updated: {formatDateTime(item.server_updated_at)}
                              </div>
                              <div className="pt-1">
                                {renderPayloadSummary(item.server_data)}
                              </div>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={isItemResolving || loading}
                                  onClick={() => handleResolve(item.id, 'keep_server')}
                                  className="w-full flex h-11 min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50"
                                >
                                  {isItemResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-emerald-400" />}
                                  <span>Keep Server Version</span>
                                </button>
                              </div>
                            </div>

                            {/* Local Offline Card */}
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <Smartphone className="h-3.5 w-3.5" />
                                  Your Offline Data
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400">
                                Entered Locally: {formatDateTime(item.local_timestamp)}
                              </div>
                              <div className="pt-1">
                                {renderPayloadSummary(item.local_data)}
                              </div>
                              <div className="pt-2">
                                <button
                                  type="button"
                                  disabled={isItemResolving || loading}
                                  onClick={() => handleResolve(item.id, 'overwrite_with_mine')}
                                  className="w-full flex h-11 min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition cursor-pointer disabled:opacity-50"
                                >
                                  {isItemResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                  <span>Overwrite Server with Mine</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Footer Bar */}
                {conflicts.length > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/70 px-6 py-3.5">
                    <span className="text-xs text-slate-400">
                      Batch resolution for all {conflicts.length} conflicts:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleResolveAll('keep_server')}
                        className="flex h-11 min-h-[44px] items-center px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-50"
                      >
                        Accept All Server
                      </button>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleResolveAll('overwrite_with_mine')}
                        className="flex h-11 min-h-[44px] items-center px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        Overwrite All Mine
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
