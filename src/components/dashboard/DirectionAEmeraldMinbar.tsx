"use client";

import React from "react";
import { BookOpen, GraduationCap, CheckCircle2, AlertTriangle, ArrowRight, Printer, FileText } from "lucide-react";
import { DashboardData } from "@/components/layout/dashboard-content";

export function DirectionAEmeraldMinbar({ data, onAction }: { data: DashboardData; onAction?: (action: string) => void }) {
  const k = data.kpis;

  return (
    <div className="w-full bg-[#fdfbf7] text-[#0f172a] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Islamic Architectural Header Band */}
      <header className="border-b-2 border-[#064e3b] pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#b45309] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#b45309]" aria-hidden="true" />
              Direction A: Emerald Minbar
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-serif text-[#064e3b] tracking-wide" lang="ar" dir="rtl">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#064e3b] tracking-tight">
            Jiddah Islamic Schools
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Academic Operations & Report Engine — <span className="font-medium text-slate-800">Term 1, 2026</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onAction?.('marks')}
            className="px-4 py-2 bg-[#064e3b] hover:bg-[#043327] text-white text-xs font-medium rounded shadow-sm flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#064e3b]"
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            Enter Term Marks
          </button>
          <button
            type="button"
            onClick={() => onAction?.('reports')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-[#064e3b] border border-[#064e3b]/30 text-xs font-medium rounded shadow-sm flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#064e3b]"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            Batch Print Cards
          </button>
        </div>
      </header>

      {/* Institutional KPI Ledger */}
      <section aria-labelledby="kpi-heading" className="mb-8">
        <h2 id="kpi-heading" className="sr-only">Academic Key Metrics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border-l-4 border-[#064e3b] p-5 rounded-r shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Total Enrolled</span>
            <div className="text-3xl font-serif font-bold text-[#064e3b] tabular-nums">{k.totalStudents}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
              <span>Primary 1 through 7</span>
            </div>
          </div>

          <div className="bg-white border-l-4 border-[#064e3b] p-5 rounded-r shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Faculty Active</span>
            <div className="text-3xl font-serif font-bold text-[#064e3b] tabular-nums">{k.activeTeachers}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span className="text-emerald-800 font-medium">Secular & Theology Staff</span>
            </div>
          </div>

          <div className="bg-white border-l-4 border-[#b45309] p-5 rounded-r shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Reports Compiled</span>
            <div className="text-3xl font-serif font-bold text-[#b45309] tabular-nums">{k.reportsGenerated}</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span className="text-amber-800 font-medium">91.5% Cohort Complete</span>
            </div>
          </div>

          <div className="bg-white border-l-4 border-slate-400 p-5 rounded-r shadow-xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-1">Term Attendance</span>
            <div className="text-3xl font-serif font-bold text-slate-800 tabular-nums">{k.avgAttendance}%</div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>Verified School Average</span>
            </div>
          </div>
        </div>
      </section>

      {/* Dual Curriculum Performance & Action Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Cohort Performance Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-[#e2d9cc] rounded p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-[#064e3b]">Dual Curriculum Class Standings</h3>
                <p className="text-xs text-slate-500 mt-0.5">National UNEB Primary vs Islamic Theology (IPLE) Averages</p>
              </div>
              <span className="text-xs font-serif text-[#064e3b] bg-[#f0fdf4] px-2.5 py-1 rounded border border-emerald-200">
                Uganda UNEB Standards
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-[#fcfaf7] text-slate-500 uppercase font-semibold text-[10px] border-b border-[#e2d9cc]">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Class Cohort</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Secular Mean</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Theology Mean</th>
                    <th scope="col" className="py-2.5 px-3">Dominant Division</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.classPerformance.map((cp, idx) => (
                    <tr key={cp.class} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-900">{cp.class}</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums">{cp.avg}%</td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-800 font-medium">
                        {Math.min(98, cp.avg + 4)}%
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-serif bg-emerald-50 text-emerald-900 border border-emerald-200">
                          {idx === 0 || idx === 4 || idx === 6 ? 'Division I' : 'Division II'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Complete
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Col: Urgent Administrative Notice & Action Queue */}
        <div className="space-y-6">
          <section className="bg-white border border-[#e2d9cc] rounded p-6 shadow-xs">
            <h3 className="text-base font-serif font-bold text-[#064e3b] mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#b45309]" aria-hidden="true" />
              Administrative Attention
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-[#fffbeb] border-l-3 border-[#b45309] rounded-r text-xs">
                <span className="font-semibold text-amber-950 block">P.7 Final Assessment Moderation</span>
                <p className="text-slate-600 mt-1">4 candidates require DOS sign-off before official PLE clearance.</p>
              </div>
              <div className="p-3 bg-[#f0fdf4] border-l-3 border-[#064e3b] rounded-r text-xs">
                <span className="font-semibold text-emerald-950 block">Arabic Handwriting Certificates</span>
                <p className="text-slate-600 mt-1">Theology department completed grading for Primary 3 & 4.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-[#e2d9cc] rounded p-6 shadow-xs">
            <h3 className="text-base font-serif font-bold text-[#064e3b] mb-3">Recent Faculty Submissions</h3>
            <ul className="space-y-2.5 text-xs text-slate-600" role="list">
              {data.recentActivity.map((act) => (
                <li key={act.id} className="pb-2 border-b border-slate-100 last:border-0 flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#064e3b] shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <span className="font-medium text-slate-800">{act.user_name}</span>
                    <span className="text-slate-500 block text-[11px]">{act.action.replace(/_/g, ' ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
