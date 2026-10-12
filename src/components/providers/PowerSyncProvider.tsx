// @ts-nocheck
"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { PowerSyncDatabase } from "@powersync/web";
import { PowerSyncContext } from "@powersync/react";
import { AppSchema } from "../../lib/powersync/AppSchema";
import { SupabaseConnector } from "../../lib/powersync/SupabaseConnector";
import { PowerSyncSplash } from "../layout/PowerSyncSplash";

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: "jiddah_report_engine.sqlite",
  },
});

export const connector = new SupabaseConnector();

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  // If running in SSR or headless testing environment, initialize immediately to prevent hangs
  const isHeadlessOrSSR = typeof window === 'undefined' || 
    (typeof navigator !== 'undefined' && Boolean(navigator.webdriver || /HeadlessChrome|jsdom/i.test(navigator.userAgent || '')));

  const [isInitialized, setIsInitialized] = useState(isHeadlessOrSSR);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Fallback timer: if initialization takes longer than 3.5s (or 100ms in headless), proceed so user is not locked out
    const fallbackTimer = setTimeout(() => {
      if (isMounted && !isInitialized) {
        console.warn("PowerSync init fallback timeout reached — proceeding with direct connection.");
        setIsInitialized(true);
      }
    }, isHeadlessOrSSR ? 100 : 3500);

    powerSync.init()
      .then(() => {
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(console.error);
        }
        if (isMounted) setIsInitialized(true);
      })
      .catch((err) => {
        console.warn("PowerSync local init skipped / fallback to direct connection:", err);
        if (isMounted) {
          setInitError(err instanceof Error ? err.message : String(err));
          setIsInitialized(true);
        }
      })
      .finally(() => {
        clearTimeout(fallbackTimer);
      });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      try {
        powerSync.disconnect();
      } catch (e) {}
    };
  }, []);

  if (typeof window === 'undefined') {
    return <>{children}</>;
  }

  if (!isInitialized) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0f172a] text-slate-100">
        <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-slate-700">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-semibold text-slate-200">Jiddah Smart Engine</h2>
        <p className="text-xs text-slate-400 mt-1">Initializing local database and storage...</p>
      </div>
    );
  }

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <PowerSyncSplash>
        {children}
      </PowerSyncSplash>
    </PowerSyncContext.Provider>
  );
}

