"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  ClipboardEdit,
  FileText,
  AlertTriangle,
  Printer,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  MoreHorizontal,
  Bell,
  Sparkles,
  CalendarCheck,
  ChevronRight,
  RefreshCw,
  Eye,
  GraduationCap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/figma-ui/ui/dropdown-menu";
import { cn } from "@/components/figma-ui/ui/utils";

export interface ClassReportingStatus {
  className: string;
  totalStudents: number;
  marksEntered: number;
  totalRequired: number;
  missingMarks: number;
  stage: "marks_in" | "checked" | "remarks" | "approved" | "printed";
  stageLabel: string;
  percent: number;
  anomalies: number;
}

export interface DashboardData {
  role: "admin" | "dos" | "teacher";
  kpis: {
    totalStudents: number;
    activeTeachers: number;
    reportsGenerated: number;
    avgAttendance: number;
    missingMarks: number;
    totalAnomalies: number;
    readyToPrintCount: number;
  };
  classStatuses: ClassReportingStatus[];
  attendanceTrend: { month: string; rate: number }[];
  classPerformance: { class: string; avg: number }[];
  recentActivity: {
    id: string;
    entity_type: string;
    user_name: string;
    action: string;
    created_at: string;
  }[];
  notifications: {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
  }[];
  upcomingEvents?: {
    title: string;
    date: string;
    type: string;
  }[];
  themeSettings: {
    schoolName: string;
    rawThemeColor: string;
    safeThemeColor: string;
    contrastRatio: number;
    wasAdjusted: boolean;
    currentTerm: string;
    currentYear: number | string;
  };
}

export default function DashboardContent({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { role, kpis, classStatuses, themeSettings, recentActivity, notifications } = data;
  const isTeacher = role === "teacher";
  const isDOS = role === "dos";
  const isAdmin = role === "admin";

  const [filter, setFilter] = useState<"all" | "needs_action" | "completed">("all");
  const [telemetryTab, setTelemetryTab] = useState<"notifications" | "activity" | "presence">("notifications");

  const totalMissingMarks = kpis.missingMarks ?? 0;
  const totalAnomalies = kpis.totalAnomalies ?? 0;
  const totalStudents = kpis.totalStudents ?? 0;
  const activeTeachers = kpis.activeTeachers ?? 0;
  const reportsGenerated = kpis.reportsGenerated ?? 0;

  // Compute Overall Reporting Cycle Percentage
  const overallCyclePercent = useMemo(() => {
    const totalRequired = classStatuses.reduce((acc, curr) => acc + curr.totalRequired, 0);
    const totalEntered = classStatuses.reduce((acc, curr) => acc + curr.marksEntered, 0);
    if (totalRequired === 0) return 0;
    return Math.min(100, Math.round((totalEntered / totalRequired) * 100));
  }, [classStatuses]);

  // Filtered Class List
  const filteredClasses = useMemo(() => {
    if (filter === "needs_action") {
      return classStatuses.filter((c) => c.missingMarks > 0 || c.anomalies > 0);
    }
    if (filter === "completed") {
      return classStatuses.filter((c) => c.percent === 100 && c.anomalies === 0);
    }
    return classStatuses;
  }, [classStatuses, filter]);

  // Spotlight Next Action
  const nextAction = useMemo(() => {
    if (classStatuses.length === 0 || totalStudents === 0) {
      return {
        title: "Initialize Reporting Cohorts",
        desc: "Enroll students and configure classes to launch the academic term assessment cycle.",
        ctaText: "Enroll Students",
        ctaHref: "/admin/students",
        badge: "Action Required",
      };
    }
    if (totalMissingMarks > 0) {
      const pendingClasses = classStatuses.filter((c) => c.missingMarks > 0);
      const sampleNames = pendingClasses.map((c) => c.className).slice(0, 2).join(", ");
      const more = pendingClasses.length > 2 ? ` +${pendingClasses.length - 2} more` : "";
      return {
        title: `${totalMissingMarks} Pending Scores in ${sampleNames}${more}`,
        desc: "Complete pending mark sheets across secular and theology subjects to unlock report verification.",
        ctaText: "Enter Class Marks",
        ctaHref: "/admin/marks",
        badge: isTeacher ? "Teacher Priority" : "Assessment Milestone",
      };
    }
    if (totalAnomalies > 0) {
      return {
        title: `${totalAnomalies} Score Outliers Flagged`,
        desc: "Values exceeding 100% or anomalous entry formats detected. Review required before compilation.",
        ctaText: "Resolve Outliers",
        ctaHref: "/admin/marks",
        badge: "Quality Audit",
      };
    }
    return {
      title: `Term Assessment Cycle: ${overallCyclePercent}% Complete`,
      desc: "All core subject scores are verified. Report dossiers can now be generated, stamped, and printed.",
      ctaText: "Open Report Studio",
      ctaHref: "/admin/reports/studio",
      badge: "Ready for Compilation",
    };
  }, [classStatuses, totalStudents, totalMissingMarks, totalAnomalies, isTeacher, overallCyclePercent]);

  // Assessment Distribution for Donut Chart
  const totalRequiredAll = classStatuses.reduce((acc, curr) => acc + curr.totalRequired, 0);
  const totalEnteredAll = classStatuses.reduce((acc, curr) => acc + curr.marksEntered, 0);
  const recordedRatio = totalRequiredAll > 0 ? totalEnteredAll / totalRequiredAll : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - recordedRatio * circumference;

  return (
    <div className="w-full min-h-full p-3 sm:p-5 lg:p-7 space-y-6 font-sans">
      {/* ─── HEADER BAR ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle,rgba(255,255,255,0.08))]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="size-3.5" strokeWidth={1.75} />
              Command Center
            </span>
            <span className="text-xs text-stone-400 font-medium">
              {themeSettings.currentTerm} • Academic Year {themeSettings.currentYear}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-[var(--text-primary,#F1F5F9)]">
            {isAdmin
              ? "Academic & Reporting Control Room"
              : isDOS
              ? "Curriculum & Moderation Dashboard"
              : "Teacher Class Workstation"}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            Real-time cohort telemetry, mark pipeline verification, and report production.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/marks"
            className="h-9 px-3.5 rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.12))] bg-[var(--bg-card,#111714)] hover:border-emerald-500/40 text-xs font-bold text-stone-200 flex items-center gap-2 transition-all shadow-xs"
          >
            <ClipboardEdit className="size-4 text-emerald-400" strokeWidth={1.75} />
            <span>Enter Marks</span>
          </Link>
          <Link
            href="/admin/reports/studio"
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all shadow-md"
          >
            <Sparkles className="size-4" strokeWidth={2} />
            <span>Report Studio</span>
          </Link>
        </div>
      </div>

      {/* ─── ZONE 1: 4 CENTER TOP KPI CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Marks Completion Rate Ring */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Marks Pipeline
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-400 tabular-nums">
                {overallCyclePercent}%
              </span>
              <span className="text-[11px] text-stone-400 font-medium">recorded</span>
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              {totalEnteredAll} / {totalRequiredAll} entries logged
            </p>
          </div>
          <div className="relative size-14 shrink-0 flex items-center justify-center">
            <svg className="size-14 -rotate-90" viewBox="0 0 90 90">
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="stroke-stone-800"
                strokeWidth="7"
                fill="none"
              />
              <circle
                cx="45"
                cy="45"
                r={radius}
                className="stroke-emerald-400 transition-all duration-700 ease-out"
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute text-[10px] font-extrabold text-stone-200">
              {overallCyclePercent}%
            </span>
          </div>
        </div>

        {/* KPI 2: Active Students */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5" strokeWidth={1.75} />
              Enrolled Learners
            </span>
            <div className="text-2xl font-black text-white tabular-nums">
              {totalStudents}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-stone-400">
              <span>{classStatuses.length} cohorts active</span>
              <span className="size-1 rounded-full bg-stone-600" />
              <span className="text-sky-400">100% secular</span>
            </div>
          </div>
          <div className="size-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <GraduationCap className="size-5" strokeWidth={1.75} />
          </div>
        </div>

        {/* KPI 3: Report Dossiers Ready */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="size-3.5" strokeWidth={1.75} />
              Report Dossiers
            </span>
            <div className="text-2xl font-black text-white tabular-nums">
              {reportsGenerated}
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              {totalMissingMarks === 0 ? "Ready for batch print" : `${totalMissingMarks} scores remaining`}
            </p>
          </div>
          <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Printer className="size-5" strokeWidth={1.75} />
          </div>
        </div>

        {/* KPI 4: Active Teaching Staff */}
        <div className="p-4 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" strokeWidth={1.75} />
              Staff Deployment
            </span>
            <div className="text-2xl font-black text-white tabular-nums">
              {activeTeachers}
            </div>
            <p className="text-[11px] text-stone-400 font-medium">
              Active assigned instructors
            </p>
          </div>
          <div className="size-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <Users className="size-5" strokeWidth={1.75} />
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN GRID (LEFT: CONTENT, RIGHT: TELEMETRY RAIL) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN (2 of 3 spans) */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* ─── ZONE 2: VISUAL ANALYTICS & TRENDS ────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Donut Assessment Slices */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Assessment Distribution</h3>
                  <p className="text-[11px] text-stone-400">Recorded scores across term milestones</p>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                  {totalEnteredAll} total
                </span>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="relative size-32 flex items-center justify-center">
                  <svg className="size-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1F2937" strokeWidth="12" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#10B981"
                      strokeWidth="12"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (totalEnteredAll > 0 ? (totalEnteredAll / (totalRequiredAll || 1)) * 251.2 : 0)}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-lg font-black text-white">{overallCyclePercent}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-stone-400">Captured</div>
                  </div>
                </div>
              </div>

              {/* Legend Pills */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="text-stone-300 font-medium">BOT (30%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-sky-400" />
                  <span className="text-stone-300 font-medium">MOT (30%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400" />
                  <span className="text-stone-300 font-medium">EOT (40%)</span>
                </div>
              </div>
            </div>

            {/* Performance Trend Area Chart */}
            <div className="p-5 rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Cohort Performance Curve</h3>
                  <p className="text-[11px] text-stone-400">Average syllabus progression & accuracy</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                  <TrendingUp className="size-3.5" strokeWidth={2} />
                  <span>+4.2%</span>
                </div>
              </div>

              {/* Area Trend SVG */}
              <div className="h-32 w-full relative flex items-end">
                <svg className="w-full h-28 overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0 65 Q 40 50, 80 40 T 160 30 T 240 15 L 240 80 L 0 80 Z"
                    fill="url(#areaGradient)"
                  />
                  <path
                    d="M 0 65 Q 40 50, 80 40 T 160 30 T 240 15"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="80" cy="40" r="3.5" fill="#84CC16" />
                  <circle cx="160" cy="30" r="3.5" fill="#84CC16" />
                  <circle cx="240" cy="15" r="4.5" fill="#84CC16" className="animate-pulse" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-white/5">
                <span>BOT Baseline</span>
                <span>MOT Progress</span>
                <span className="text-emerald-400 font-bold">EOT Projection</span>
              </div>
            </div>
          </div>

          {/* ─── QUICK ACTION SPOTLIGHT CARD ──────────────────────── */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111714] via-[#14231A] to-[#111714] border border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.12)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  {nextAction.badge}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {nextAction.title}
              </h2>
              <p className="text-xs text-stone-300 max-w-xl">
                {nextAction.desc}
              </p>
            </div>
            <Link
              href={nextAction.ctaHref}
              className="h-10 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 shrink-0 hover:brightness-105 active:scale-95 transition-all shadow-md"
            >
              <span>{nextAction.ctaText}</span>
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          {/* ─── ZONE 3: CLASS REPORTING STATUS TABLE ─────────────── */}
          <div className="rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] overflow-hidden shadow-xs">
            {/* Table Header & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Class Reporting Breakdown</h3>
                <p className="text-xs text-stone-400">
                  Per-cohort verification, completion rates, and outlier audits.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "all" ? "bg-emerald-500 text-black font-bold" : "text-stone-400 hover:text-white"
                  )}
                >
                  All Classes ({classStatuses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("needs_action")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "needs_action" ? "bg-emerald-500 text-black font-bold" : "text-stone-400 hover:text-white"
                  )}
                >
                  Pending Action
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "completed" ? "bg-emerald-500 text-black font-bold" : "text-stone-400 hover:text-white"
                  )}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Class / Cohort</th>
                    <th className="py-3 px-4">Learners</th>
                    <th className="py-3 px-4">Marks Progress</th>
                    <th className="py-3 px-4">Audit Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-stone-400">
                        No cohorts matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                          <span className="size-2 rounded-full bg-emerald-400" />
                          <span>{cls.className}</span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-300 font-medium">
                          {cls.totalStudents} pupils
                        </td>
                        <td className="py-3.5 px-4 min-w-[160px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-stone-300 font-semibold">{cls.percent}%</span>
                              <span className="text-stone-500">
                                {cls.marksEntered}/{cls.totalRequired}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-stone-800 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  cls.percent === 100
                                    ? "bg-emerald-400"
                                    : cls.percent > 50
                                    ? "bg-lime-400"
                                    : "bg-amber-400"
                                )}
                                style={{ width: `${cls.percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {cls.anomalies > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <AlertTriangle className="size-3" />
                              {cls.anomalies} Outliers
                            </span>
                          ) : cls.percent === 100 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="size-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer ml-auto"
                                aria-label="Class actions"
                              >
                                <MoreHorizontal className="size-4" strokeWidth={1.75} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 p-1.5 rounded-xl bg-[#111714] border border-white/10 text-white shadow-2xl z-50 text-xs"
                            >
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/marks")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer font-medium"
                              >
                                <ClipboardEdit className="size-3.5 text-emerald-400" strokeWidth={1.75} />
                                <span>Enter Marks</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/students")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer font-medium"
                              >
                                <Users className="size-3.5 text-sky-400" strokeWidth={1.75} />
                                <span>View Students</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/reports")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-400 cursor-pointer font-medium"
                              >
                                <Printer className="size-3.5 text-amber-400" strokeWidth={1.75} />
                                <span>Generate Reports</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ─── RIGHT TELEMETRY RAIL (1 of 3 spans) ──────────────── */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[var(--bg-card,#111714)] border border-[var(--border-subtle,rgba(255,255,255,0.08))] p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Telemetry Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTelemetryTab("notifications")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                    telemetryTab === "notifications"
                      ? "bg-emerald-500 text-black font-bold"
                      : "text-stone-400 hover:text-white"
                  )}
                >
                  <Bell className="size-3" strokeWidth={1.75} />
                  <span>Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTelemetryTab("activity")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    telemetryTab === "activity"
                      ? "bg-emerald-500 text-black font-bold"
                      : "text-stone-400 hover:text-white"
                  )}
                >
                  Audit
                </button>
                <button
                  type="button"
                  onClick={() => setTelemetryTab("presence")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    telemetryTab === "presence"
                      ? "bg-emerald-500 text-black font-bold"
                      : "text-stone-400 hover:text-white"
                  )}
                >
                  Staff
                </button>
              </div>

              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Tab 1: Live Notifications */}
            {telemetryTab === "notifications" && (
              <div className="space-y-3">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No active notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white line-clamp-1">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-stone-500 shrink-0 font-mono">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
                <Link
                  href="/admin/notifications"
                  className="block text-center text-[11px] font-bold text-emerald-400 hover:underline pt-2"
                >
                  View All Notifications →
                </Link>
              </div>
            )}

            {/* Tab 2: Activity Timeline */}
            {telemetryTab === "activity" && (
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No recent activities recorded.
                  </div>
                ) : (
                  recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-stone-200">{log.user_name}</span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-mono">{log.action}</p>
                    </div>
                  ))
                )}
                <Link
                  href="/admin/activity"
                  className="block text-center text-[11px] font-bold text-emerald-400 hover:underline pt-2"
                >
                  View Complete Audit Log →
                </Link>
              </div>
            )}

            {/* Tab 3: Staff Presence */}
            {telemetryTab === "presence" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-stone-400 pb-1">
                  <span>Assigned Faculty</span>
                  <span className="text-emerald-400 font-bold">{activeTeachers} Active</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                        HT
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Head Teacher</div>
                        <div className="text-[10px] text-stone-400">Administration</div>
                      </div>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center">
                        DS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">DOS Secular</div>
                        <div className="text-[10px] text-stone-400">Curriculum Moderation</div>
                      </div>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center">
                        DT
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">DOS Theology</div>
                        <div className="text-[10px] text-stone-400">Islamic Studies</div>
                      </div>
                    </div>
                    <span className="size-2 rounded-full bg-emerald-400" />
                  </div>
                </div>
                <Link
                  href="/admin/teachers"
                  className="block text-center text-[11px] font-bold text-emerald-400 hover:underline pt-2"
                >
                  Manage Faculty Roster →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
