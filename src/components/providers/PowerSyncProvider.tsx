// @ts-nocheck
"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { PowerSyncDatabase } from "@powersync/web";
import { PowerSyncContext } from "@powersync/react";
import { AppSchema } from "../../lib/powersync/AppSchema";
import { SupabaseConnector } from "../../lib/powersync/SupabaseConnector";

export const powerSync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: "jiddah_report_engine.sqlite",
  },
});

export const connector = new SupabaseConnector();

import { PowerSyncSplash } from "../layout/PowerSyncSplash";

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // PowerSync network sync is paused/disabled in favor of direct Supabase connection.
    powerSync.init()
      .then(() => {
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(console.error);
        }
        if (isMounted) setIsInitialized(true);
      })
      .catch((err) => {
        console.warn("PowerSync local init skipped:", err);
        if (isMounted) setIsInitialized(true);
      });

    return () => {
      isMounted = false;
      try {
        powerSync.disconnect();
      } catch (e) {}
    };
  }, []);

  if (!isInitialized) {
    return <div className="h-screen w-full bg-[#0f172a]" />;
  }

  return (
    <PowerSyncContext.Provider value={powerSync}>
      <PowerSyncSplash>
        {children}
      </PowerSyncSplash>
    </PowerSyncContext.Provider>
  );
}
