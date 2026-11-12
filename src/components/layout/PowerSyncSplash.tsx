"use client";

import React from "react";

/**
 * Legacy splash wrapper retained as a non-blocking pass-through
 * so SSR and offline/budget devices never stall behind a sync screen.
 */
export function PowerSyncSplash({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
