import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function AppFooter() {
  return (
    <footer className="w-full border-t border-slate-200/60 bg-white/50 backdrop-blur-md dark:bg-[#0a0f1c]/80 dark:border-slate-800/60 px-6 py-5 mt-auto shrink-0 print:hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-8 rounded-lg bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
            <GraduationCap className="size-4" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Jiddah Smart Report Engine
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
              © {new Date().getFullYear()} Jiddah Islamic School. All rights reserved.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <Link href="#" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Support
          </Link>
          <Link href="#" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Privacy
          </Link>
          <Link href="#" className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
