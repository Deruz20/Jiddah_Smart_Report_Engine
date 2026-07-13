import React from "react";

export function AppFooter() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white dark:bg-[#111827] dark:border-white/10 px-6 py-4 mt-auto shrink-0 print:hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Jiddah Islamic School. All rights reserved.
        </p>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Support
          </a>
          <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Privacy Policy
          </a>
          <a href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
}
