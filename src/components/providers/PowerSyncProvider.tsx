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
    // Initialize PowerSync
    powerSync.init().then(() => {
      // Setup persistent storage if possible
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(console.error);
      }

      // Connect to the backend
      powerSync.connect(connector);
      setIsInitialized(true);
    }).catch(console.error);

    return () => {
      powerSync.disconnect();
    };
  }, []);

  if (!isInitialized) {
    // Basic fallback while SQLite sets up locally (usually instant)
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
