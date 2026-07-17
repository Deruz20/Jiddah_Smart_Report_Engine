import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="w-full mt-auto shrink-0 print:hidden px-6 pb-6 pt-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <GraduationCap className="size-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Jiddah Smart Report Engine
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              © {new Date().getFullYear()} Jiddah Islamic School.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="#" className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Support
          </Link>
          <Link href="#" className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Privacy Policy
          </Link>
          <Link href="#" className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}
