// @ts-nocheck
"use client";

import React, { ReactNode, useEffect, useState } from "react";
import { PowerSyncDatabase } from "@powersync/web";
import { PowerSyncContext } from "@powersync/react";
import { AppSchema } from "../../lib/powersync/AppSchema";
import { SupabaseConnector } from "../../lib/powersync/SupabaseConnector";
import { createClient } from "@/utils/supabase/client";

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
    const supabase = createClient();

    const syncAuthState = async () => {
      if (!isMounted) return;

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        powerSync.connect(connector);
      } else {
        powerSync.disconnect();
      }
    };

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (session) {
        powerSync.connect(connector);
      } else {
        powerSync.disconnect();
      }
    });

    powerSync.init()
      .then(() => {
        if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
          navigator.storage.persist().catch(console.error);
        }

        return syncAuthState();
      })
      .then(() => {
        if (isMounted) setIsInitialized(true);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
      subscription.data.subscription.unsubscribe();
      powerSync.disconnect();
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

