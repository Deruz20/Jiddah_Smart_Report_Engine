"use client";

import React, { useState } from "react";
import { Clock, ShieldCheck, LogOut, RefreshCw, Mail } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function PendingSetup() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#090C0A] p-4 font-sans">
      <div className="w-full max-w-md bg-white dark:bg-[#1E2623] p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 dark:border-white/10 text-center relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-[#10B981] to-transparent" />

        <div className="size-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto mb-6 text-amber-600 dark:text-amber-400">
          <Clock className="size-8 animate-pulse" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mb-3">
          Verification In Progress
        </span>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">
          Account Pending Activation
        </h1>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          Your staff credentials have been verified. An administrator is assigning your curriculum tracks and teaching classes. You will be able to access the dashboard once classes are mapped.
        </p>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 text-left text-xs text-slate-500 dark:text-slate-400 space-y-2 mb-8">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold">
            <ShieldCheck className="size-4 text-[#10B981]" />
            What happens next?
          </div>
          <p>
            1. The Head Teacher / DOS reviews your class allocation.
          </p>
          <p>
            2. Your permissions for marks entry and report generation are enabled.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            Check Activation Status
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full h-11 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="size-3.5" />
            {loggingOut ? "Signing Out..." : "Sign Out & Return to Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
