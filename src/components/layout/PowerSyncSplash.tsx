'use client'

import React, { useEffect, useState } from 'react'
import { useStatus } from '@powersync/react'
import { motion, AnimatePresence } from 'motion/react'
import { Database, Loader2, CheckCircle2, WifiOff } from 'lucide-react'

export function PowerSyncSplash({ children }: { children: React.ReactNode }) {
  const status = useStatus()
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    // Hide splash if we have finished an initial sync OR if we are explicitly disconnected/offline
    // after a short timeout so we don't block them forever if they start the app offline.
    if (status.hasSynced) {
      setShowSplash(false)
    }
  }, [status.hasSynced])

  useEffect(() => {
    // Safety fallback: if we haven't synced after 10 seconds, and we aren't downloading, let them in.
    const timer = setTimeout(() => {
      if (!status.hasSynced && !status.dataFlowStatus.downloading) {
        setShowSplash(false)
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [status.hasSynced, status.dataFlowStatus.downloading])

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0f172a] text-slate-100"
          >
            <div className="flex flex-col items-center max-w-sm w-full px-6">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-slate-700">
                <Database className="w-10 h-10 text-indigo-400" />
              </div>
              
              <h1 className="text-2xl font-semibold mb-2 tracking-tight">Jiddah Smart</h1>
              
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-8 h-6">
                {status.dataFlowStatus.downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Synchronizing database...</span>
                  </>
                ) : !status.connected ? (
                  <>
                    <WifiOff className="w-4 h-4 text-rose-400" />
                    <span>Offline. Loading local cache...</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span>Connecting...</span>
                  </>
                )}
              </div>

              {/* Progress bar container */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden relative">
                <motion.div 
                  className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: status.hasSynced ? "100%" : 
                           status.dataFlowStatus.downloading ? "75%" : "25%" 
                  }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
              </div>
            </div>
            
            <div className="absolute bottom-10 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium tracking-wide">
              <span>END-TO-END OFFLINE ENABLED</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render children underneath but prevent interaction if splash is showing by having splash block pointer events */}
      <div className={showSplash ? "pointer-events-none overflow-hidden h-screen" : ""}>
        {children}
      </div>
    </>
  )
}
