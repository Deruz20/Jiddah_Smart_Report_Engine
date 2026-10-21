"use client";

import React from "react";
import { Layers, Activity, Database, Check, Clock, ChevronRight, Download, SlidersHorizontal } from "lucide-react";
import { DashboardData } from "@/components/layout/dashboard-content";

export function DirectionBModernNordic({ data, onAction }: { data: DashboardData; onAction?: (action: string) => void }) {
  const k = data.kpis;

  return (
    <div className="w-full bg-[#f8fafc] text-[#0f172a] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Top Utility Bar */}
      <div className="border border-[#e2e8f0] bg-white rounded-lg p-4 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-xs">
            JIS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                Direction B · Modern Nordic
              </span>
              <span className="text-xs text-slate-400">/</span>
              <span className="text-xs font-mono text-slate-500">SYS.2026.T1</span>
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              Operations Control Console
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => onAction?.('marks')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-900 flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5" aria-hidden="true" />
            <span>MARKS_ENTRY</span>
          </button>
          <button
            type="button"
            onClick={() => onAction?.('reports')}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>EXPORT_BATCH</span>
          </button>
        </div>
      </div>

      {/* High Density Metric Strip */}
      <section aria-labelledby="metrics-summary" className="mb-6">
        <h2 id="metrics-summary" className="sr-only">System Overview Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="border border-[#e2e8f0] bg-white p-3.5 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
              <span>ENROLLED</span>
              <span className="text-slate-400">P1-P7</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{k.totalStudents}</div>
            <div className="text-[10px] text-slate-400 mt-1">100% active roster</div>
          </div>

          <div className="border border-[#e2e8f0] bg-white p-3.5 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
              <span>FACULTY</span>
              <span className="text-slate-400">SEC/THEO</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{k.activeTeachers}</div>
            <div className="text-[10px] text-emerald-600 font-medium mt-1">All posts assigned</div>
          </div>

          <div className="border border-[#e2e8f0] bg-white p-3.5 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
              <span>PROCESSED</span>
              <span className="text-blue-600 font-medium">91.5%</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-blue-600 tabular-nums">{k.reportsGenerated}</div>
            <div className="text-[10px] text-slate-400 mt-1">38 cards pending</div>
          </div>

          <div className="border border-[#e2e8f0] bg-white p-3.5 rounded-lg">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mb-1">
              <span>ATTENDANCE</span>
              <span className="text-slate-400">30-DAY</span>
            </div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{k.avgAttendance}%</div>
            <div className="text-[10px] text-slate-400 mt-1">Within standard variance</div>
          </div>
        </div>
      </section>

      {/* Main Administrative Data Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Compact Class Status Ledger */}
        <div className="lg:col-span-8">
          <div className="border border-[#e2e8f0] bg-white rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#e2e8f0] bg-slate-50/70 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                Cohort Marks & Verification Ledger
              </span>
              <span className="text-[11px] font-mono text-slate-500">7 cohorts registered</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/50 text-[10px] uppercase font-mono text-slate-500 border-b border-[#e2e8f0]">
                  <tr>
                    <th scope="col" className="py-2.5 px-4 font-semibold">Cohort</th>
                    <th scope="col" className="py-2.5 px-4 font-semibold text-right">Secular</th>
                    <th scope="col" className="py-2.5 px-4 font-semibold text-right">Theology</th>
                    <th scope="col" className="py-2.5 px-4 font-semibold">Progress</th>
                    <th scope="col" className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {data.classPerformance.map((cp, idx) => {
                    const pct = Math.min(100, Math.round((cp.avg / 95) * 100));
                    return (
                      <tr key={cp.class} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-medium text-slate-900">{cp.class}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{cp.avg}%</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 font-medium">
                          {Math.min(98, cp.avg + 4)}%
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-[120px] overflow-hidden">
                            <div className="bg-slate-800 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onAction?.('marks')}
                            className="text-slate-600 hover:text-slate-900 font-mono text-[10px] underline hover:no-underline focus-visible:ring-1 focus-visible:ring-slate-500 rounded"
                          >
                            OPEN_GRID
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 4 cols: Audit Feed & Status Flags */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-[#e2e8f0] bg-white rounded-lg p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-3 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              Real-time Mutation Stream
            </span>
            <div className="space-y-2.5">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="text-xs pb-2 border-b border-slate-100 last:border-0">
                  <div className="flex items-center justify-between text-slate-800 font-medium">
                    <span>{act.user_name}</span>
                    <span className="text-[10px] font-mono text-slate-400">JUST_NOW</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 mt-0.5 truncate">{act.action}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#e2e8f0] bg-white rounded-lg p-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block mb-2">
              Pipeline Health
            </span>
            <div className="text-xs text-slate-600 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span>DATABASE_TARGET:</span>
                <span className="text-emerald-700 font-bold">REHEARSAL_PORT_54322</span>
              </div>
              <div className="flex justify-between">
                <span>ROW_LEVEL_SECURITY:</span>
                <span className="text-emerald-700 font-bold">CATALOG_VERIFIED</span>
              </div>
              <div className="flex justify-between">
                <span>ARCH_TENANT_SCOPE:</span>
                <span className="text-slate-700">SINGLE_SCHOOL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
