"use client";

import React from "react";
import { Sparkles, Sun, Award, Compass, FileCheck, Users, ChevronRight, Bookmark } from "lucide-react";
import { DashboardData } from "@/components/layout/dashboard-content";

export function DirectionCVibrantOasis({ data, onAction }: { data: DashboardData; onAction?: (action: string) => void }) {
  const k = data.kpis;

  return (
    <div className="w-full bg-[#fdfaf5] text-[#1c1917] p-4 sm:p-6 lg:p-8 font-sans">
      {/* Warm Oasis Community Greeting Banner */}
      <div className="bg-gradient-to-r from-[#0f766e] to-[#115e59] text-white rounded-2xl p-6 sm:p-8 mb-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-medium text-amber-200 mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Direction C · Vibrant Oasis Academy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back to Jiddah Hub
          </h1>
          <p className="text-teal-100 text-sm mt-2 leading-relaxed">
            Term 1 compilation is active. 412 of 450 report cards are compiled and ready for Head Teacher signature.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onAction?.('marks')}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition-all transform active:scale-95 shadow-sm flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <FileCheck className="w-4 h-4" aria-hidden="true" />
              <span>Enter Marks Now</span>
            </button>
            <button
              type="button"
              onClick={() => onAction?.('reports')}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs rounded-xl transition-all backdrop-blur-xs flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-white"
            >
              <Award className="w-4 h-4" aria-hidden="true" />
              <span>Review Generated Cards</span>
            </button>
          </div>
        </div>

        {/* Decorative Sun Glow */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" aria-hidden="true" />
      </div>

      {/* Vibrant Metric Pill Cards */}
      <section aria-labelledby="oasis-stats" className="mb-8">
        <h2 id="oasis-stats" className="sr-only">Academy Key Numbers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs hover:border-teal-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Learners</span>
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
                <Users className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tabular-nums">{k.totalStudents}</div>
            <span className="text-xs text-stone-500 mt-1 block">Active across 7 cohorts</span>
          </div>

          <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Instructors</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                <Compass className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tabular-nums">{k.activeTeachers}</div>
            <span className="text-xs text-stone-500 mt-1 block">Secular & Theology faculty</span>
          </div>

          <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs hover:border-teal-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Reports Ready</span>
              <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center">
                <Bookmark className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-teal-700 tabular-nums">{k.reportsGenerated}</div>
            <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-teal-600 h-1.5 rounded-full" style={{ width: '91.5%' }} />
            </div>
          </div>

          <div className="bg-white border border-stone-200/80 p-5 rounded-2xl shadow-xs hover:border-amber-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Attendance</span>
              <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                <Sun className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-stone-900 tabular-nums">{k.avgAttendance}%</div>
            <span className="text-xs text-emerald-700 font-medium mt-1 block">+2.4% vs last term</span>
          </div>
        </div>
      </section>

      {/* Cohort Progress & Teacher Action Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-stone-900">Class Progress Tracker</h3>
              <p className="text-xs text-stone-500">Real-time marks compilation status across all primary levels</p>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
              Term 1 Snapshot
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.classPerformance.map((cp, idx) => (
              <div key={cp.class} className="p-3.5 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-stone-50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-stone-900">{cp.class}</span>
                  <span className="text-[11px] font-bold text-teal-700 font-mono tabular-nums">{cp.avg}% avg</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-stone-500 mb-2">
                  <span>Secular: {cp.avg}%</span>
                  <span className="text-amber-800 font-medium">Theology: {Math.min(98, cp.avg + 4)}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, Math.round((cp.avg / 92) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-stone-900 mb-1">Teacher Activity</h3>
            <p className="text-xs text-stone-500 mb-4">Latest submissions from the staff room</p>

            <div className="space-y-3">
              {data.recentActivity.map((act) => (
                <div key={act.id} className="p-3 rounded-xl bg-teal-50/40 border border-teal-100/60 text-xs">
                  <span className="font-bold text-teal-950 block">{act.user_name}</span>
                  <span className="text-stone-600 text-[11px] mt-0.5 block">{act.action.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAction?.('marks')}
            className="w-full mt-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            <span>Open All Mark Sheets</span>
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
