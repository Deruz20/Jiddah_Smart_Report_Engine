"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/components/figma-ui/ui/utils";

export function AppFooter() {
  return (
    <footer
      data-testid="app-footer"
      className={cn(
        "hidden md:flex w-full shrink-0 print:hidden px-4 lg:px-6 h-8 items-center justify-between border-t select-none z-10 text-[11px] transition-colors",
        "border-[var(--border-subtle,#1E293B)] bg-[var(--bg-card,#111714)] text-stone-400"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <GraduationCap className="size-3.5 text-emerald-400 shrink-0" strokeWidth={2} />
        <span className="font-semibold text-stone-200 truncate">
          Jiddah Smart Report Engine
        </span>
        <span className="opacity-40">•</span>
        <span className="tabular-nums truncate opacity-75">
          © {new Date().getFullYear()} Jiddah Islamic Schools
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-stone-400">
        <Link
          href="/admin/settings"
          className="font-medium hover:text-emerald-400 transition-colors"
        >
          School Settings
        </Link>
        <Link
          href="/admin/activity"
          className="font-medium hover:text-emerald-400 transition-colors"
        >
          Audit Trail
        </Link>
        <span className="font-mono text-[10px] opacity-60 tabular-nums">
          v2.4.0
        </span>
      </div>
    </footer>
  );
}
