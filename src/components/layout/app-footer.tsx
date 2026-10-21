"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/admin/reports" || pathname === "/admin/theology-hub" || pathname === "/admin/secular-hub") {
    return null;
  }

  return (
    <footer
      data-testid="app-footer"
      className="hidden md:flex w-full shrink-0 print:hidden px-4 lg:px-6 h-8 items-center justify-between border-t border-stone-200/70 bg-white/90 backdrop-blur-xs text-[11px] text-stone-500 select-none z-10"
    >
      <div className="flex items-center gap-2 min-w-0">
        <GraduationCap className="size-3.5 text-[#059669] shrink-0" strokeWidth={2} />
        <span className="font-semibold text-stone-700 truncate">
          Jiddah Smart Report Engine
        </span>
        <span className="text-stone-300">•</span>
        <span className="tabular-nums truncate">
          © {new Date().getFullYear()} Jiddah Islamic Schools
        </span>
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/admin/settings"
          className="font-medium text-stone-500 hover:text-[#059669] transition-colors"
        >
          School Settings
        </Link>
        <Link
          href="/admin/activity"
          className="font-medium text-stone-500 hover:text-[#059669] transition-colors"
        >
          Audit Trail
        </Link>
        <span className="font-mono text-[10px] text-stone-400 tabular-nums">
          v0.1.0-audited
        </span>
      </div>
    </footer>
  );
}
