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
  disableSSRWarning: true,
});

export const connector = new SupabaseConnector();

export function PowerSyncProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    let isMounted = true;

    powerSync.init()
      .then(() => {
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(console.error);
        }
      })
      .catch((err) => {
        console.warn("PowerSync local init skipped / direct cloud connection active:", err);
      });

    return () => {
      isMounted = false;
      try {
        powerSync.disconnect();
      } catch (e) {}
    };
  }, []);

  return (
    <PowerSyncContext.Provider value={powerSync}>
      {children}
    </PowerSyncContext.Provider>
  );
}

