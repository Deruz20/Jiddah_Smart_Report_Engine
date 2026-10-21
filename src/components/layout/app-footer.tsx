"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { usePathname } from "next/navigation";

export function AppFooter() {
  const pathname = usePathname();
  if (pathname === "/admin/reports" || pathname === "/admin/theology-hub") {
    return null;
  }

  return (
    <footer className="w-full mt-auto shrink-0 print:hidden px-4 sm:px-6 pb-6 pt-4 border-t border-stone-200/70 bg-[#FDFBF7]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-7 rounded-lg bg-[#0F4D25]/10 text-[#0F4D25]">
            <GraduationCap className="size-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-800">
              Jiddah Smart Report Engine
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5 tabular-nums">
              © {new Date().getFullYear()} Jiddah Islamic Schools.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/admin/settings" className="min-h-[44px] inline-flex items-center text-xs font-medium text-stone-600 hover:text-[#0F4D25] transition-colors">
            School Settings
          </Link>
          <Link href="/admin/activity" className="min-h-[44px] inline-flex items-center text-xs font-medium text-stone-600 hover:text-[#0F4D25] transition-colors">
            Audit Trail
          </Link>
          <span className="text-xs font-mono text-stone-500 tabular-nums">
            v0.1.0-audited
          </span>
        </div>
      </div>
    </footer>
  );
}
