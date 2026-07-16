import React from "react";
import { Loader2 } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function AdminLoading() {
  return (
    <div className="w-full h-full p-6 bg-slate-50 dark:bg-[#0f172a] animate-in fade-in duration-500 flex flex-col gap-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        <div className="col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded mb-6 animate-pulse" />
          <SkeletonLoader rows={5} />
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-6 animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
