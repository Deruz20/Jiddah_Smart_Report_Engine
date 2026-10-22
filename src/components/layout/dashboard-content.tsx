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
  staffMembers?: {
    id: string;
    name: string;
    role: string;
    department: string;
    initials: string;
    status: string;
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

  // Dynamic Next Priority Action Banner
  const nextAction = useMemo(() => {
    if (classStatuses.length === 0) {
      return {
        title: "Initialize Academic Term Roster",
        desc: "No active student enrollments found. Enroll students or configure classes to begin term tracking.",
        ctaText: "Enroll Students",
        ctaHref: "/admin/students",
        badge: "Roster Setup",
      };
    }
    if (totalMissingMarks > 0) {
      const pendingClasses = classStatuses.filter((c) => c.missingMarks > 0);
      const sampleNames = pendingClasses.slice(0, 2).map((c) => c.className).join(", ");
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
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - recordedRatio * circumference;

  return (
    <div className="w-full min-h-full p-3 sm:p-5 lg:p-6 space-y-4 lg:space-y-5 max-w-[1500px] mx-auto font-sans transition-colors">
      {/* ─── HEADER BAR (Compact & Actionable) ─────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              <ShieldCheck className="size-3" strokeWidth={2} />
              Command Center
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {themeSettings.currentTerm} • Academic Year {themeSettings.currentYear}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isAdmin
              ? "Academic & Reporting Control Room"
              : isDOS
              ? "Curriculum & Moderation Dashboard"
              : "Teacher Class Workstation"}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
            Real-time cohort telemetry, mark pipeline verification, and report production.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/admin/marks"
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151922] hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-[#1A1F2C] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all shadow-xs"
          >
            <ClipboardEdit className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            <span>Enter Marks</span>
          </Link>
          <Link
            href="/admin/reports/studio"
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-lime-500 dark:text-slate-950 font-black text-xs flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all shadow-md"
          >
            <Sparkles className="size-3.5" strokeWidth={2.2} />
            <span>Report Studio</span>
          </Link>
        </div>
      </div>

      {/* ─── ZONE 1: 4 CENTER TOP KPI CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Marks Completion Rate Ring */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Marks Pipeline
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                {overallCyclePercent}%
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">recorded</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {totalEnteredAll} / {totalRequiredAll} entries logged
            </p>
          </div>
          <div className="relative size-13 shrink-0 flex items-center justify-center">
            <svg className="size-13 -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-800"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                className="stroke-emerald-600 dark:stroke-emerald-400 transition-all duration-700 ease-out"
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <span className="absolute text-[10px] font-black text-slate-800 dark:text-slate-200">
              {overallCyclePercent}%
            </span>
          </div>
        </div>

        {/* KPI 2: Active Students */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5" strokeWidth={2} />
              Enrolled Learners
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {totalStudents}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              <span>{classStatuses.length} cohorts active</span>
              <span className="size-1 rounded-full bg-slate-400" />
              <span className="text-sky-700 dark:text-sky-400 font-semibold">100% secular</span>
            </div>
          </div>
          <div className="size-11 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <GraduationCap className="size-5" strokeWidth={1.8} />
          </div>
        </div>

        {/* KPI 3: Report Dossiers Ready */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="size-3.5" strokeWidth={2} />
              Report Dossiers
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {reportsGenerated}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              {totalMissingMarks === 0 ? "Ready for batch print" : `${totalMissingMarks} scores remaining`}
            </p>
          </div>
          <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Printer className="size-5" strokeWidth={1.8} />
          </div>
        </div>

        {/* KPI 4: Active Teaching Staff */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" strokeWidth={2} />
              Staff Deployment
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {activeTeachers}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
              Active assigned instructors
            </p>
          </div>
          <div className="size-11 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
            <Users className="size-5" strokeWidth={1.8} />
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN BALANCED GRID (8 COLS LEFT, 4 COLS RIGHT) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: 8 of 12 spans */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          {/* ─── ZONE 2: VISUAL ANALYTICS (COMPACT HEIGHT ~165px) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Donut Assessment Slices */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Assessment Distribution</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Recorded scores across term milestones</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-300 dark:border-emerald-500/20">
                  {totalEnteredAll} total
                </span>
              </div>

              <div className="flex items-center justify-around py-1">
                <div className="relative size-22 flex items-center justify-center">
                  <svg className="size-22 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="10" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      stroke="#10B981"
                      strokeWidth="10"
                      strokeDasharray="238.76"
                      strokeDashoffset={238.76 - (totalEnteredAll > 0 ? (totalEnteredAll / (totalRequiredAll || 1)) * 238.76 : 0)}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{overallCyclePercent}%</div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Captured</div>
                  </div>
                </div>

                {/* Legend Pills */}
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">BOT (30%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-sky-600 dark:bg-sky-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">MOT (30%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">EOT (40%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Trend Area Chart */}
            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Cohort Performance Curve</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Average syllabus progression & accuracy</p>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <TrendingUp className="size-3" strokeWidth={2.2} />
                  <span>+4.2%</span>
                </div>
              </div>

              {/* Area Trend SVG */}
              <div className="h-20 w-full relative flex items-end">
                <svg className="w-full h-18 overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
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
                  <circle cx="80" cy="40" r="3" fill="#84CC16" />
                  <circle cx="160" cy="30" r="3" fill="#84CC16" />
                  <circle cx="240" cy="15" r="4" fill="#84CC16" />
                </svg>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-white/5 font-medium">
                <span>BOT Baseline</span>
                <span>MOT Progress</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">EOT Projection</span>
              </div>
            </div>
          </div>

          {/* ─── QUICK ACTION SPOTLIGHT CARD ──────────────────────── */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-[#111714] dark:via-[#14231A] dark:to-[#111714] border border-emerald-300 dark:border-emerald-500/40 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {nextAction.badge}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                {nextAction.title}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium max-w-xl">
                {nextAction.desc}
              </p>
            </div>
            <Link
              href={nextAction.ctaHref}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-lime-500 dark:text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shrink-0 hover:brightness-105 active:scale-95 transition-all shadow-xs"
            >
              <span>{nextAction.ctaText}</span>
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          {/* ─── ZONE 3: CLASS REPORTING STATUS TABLE ─────────────── */}
          <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] overflow-hidden shadow-xs">
            {/* Table Header & Filter Bar */}
            <div className="p-3.5 sm:p-4 border-b border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Reporting Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Per-cohort verification, completion rates, and outlier audits.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "all"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  All Classes ({classStatuses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("needs_action")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "needs_action"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Pending Action
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    filter === "completed"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Completed
                </button>
              </div>
            </div>

            {/* Responsive Table with bounded height */}
            <div className="overflow-x-auto max-h-[290px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#161A23] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Class / Cohort</th>
                    <th className="py-2.5 px-3.5">Learners</th>
                    <th className="py-2.5 px-3.5">Marks Progress</th>
                    <th className="py-2.5 px-3.5">Audit Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                        No cohorts matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <span>{cls.className}</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300 font-medium">
                          {cls.totalStudents} pupils
                        </td>
                        <td className="py-2.5 px-3.5 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="text-slate-800 dark:text-slate-300 font-bold">{cls.percent}%</span>
                              <span className="text-slate-500">
                                {cls.marksEntered}/{cls.totalRequired}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-stone-800 overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  cls.percent === 100
                                    ? "bg-emerald-500"
                                    : cls.percent > 50
                                    ? "bg-lime-500"
                                    : "bg-amber-500"
                                )}
                                style={{ width: `${cls.percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3.5">
                          {cls.anomalies > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">
                              <AlertTriangle className="size-3" />
                              {cls.anomalies} Outliers
                            </span>
                          ) : cls.percent === 100 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                              <CheckCircle2 className="size-3" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
                              <Clock className="size-3" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="size-7 rounded-lg flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer ml-auto"
                                aria-label="Class actions"
                              >
                                <MoreHorizontal className="size-3.5" strokeWidth={1.75} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 p-1.5 rounded-xl bg-white dark:bg-[#151922] border border-slate-200 dark:border-[#252C3B] text-slate-800 dark:text-white shadow-xl z-50 text-xs"
                            >
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/marks")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-400 cursor-pointer font-medium"
                              >
                                <ClipboardEdit className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                                <span>Enter Marks</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/students")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer font-medium"
                              >
                                <Users className="size-3.5 text-sky-600 dark:text-sky-400" strokeWidth={1.75} />
                                <span>View Students</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
                              <DropdownMenuItem
                                onClick={() => router.push("/admin/reports")}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 cursor-pointer font-medium"
                              >
                                <Printer className="size-3.5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
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

        {/* ─── RIGHT TELEMETRY RAIL (4 of 12 spans) ─────────────── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] p-3.5 sm:p-4 space-y-3.5 shadow-xs">
            {/* Telemetry Tabs */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-white/5">
              <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTelemetryTab("notifications")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                    telemetryTab === "notifications"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Bell className="size-3" strokeWidth={2} />
                  <span>Alerts</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTelemetryTab("activity")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg transition-colors cursor-pointer",
                    telemetryTab === "activity"
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
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
                      ? "bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-black"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  Staff
                </button>
              </div>

              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Tab 1: Live Notifications */}
            {telemetryTab === "notifications" && (
              <div className="space-y-2.5">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No active notifications.
                  </div>
                ) : (
                  notifications.slice(0, 4).map((notif) => (
                    <div
                      key={notif.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 transition-colors space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                          {notif.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 font-mono">
                          {notif.time}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
                <Link
                  href="/admin/notifications"
                  className="block text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
                >
                  View All Notifications →
                </Link>
              </div>
            )}

            {/* Tab 2: Activity Timeline */}
            {telemetryTab === "activity" && (
              <div className="space-y-2.5">
                {recentActivity.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                    No recent activities recorded.
                  </div>
                ) : (
                  recentActivity.slice(0, 4).map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-900 dark:text-slate-200">{log.user_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono truncate">{log.action}</p>
                    </div>
                  ))
                )}
                <Link
                  href="/admin/activity"
                  className="block text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
                >
                  View Complete Audit Log →
                </Link>
              </div>
            )}

            {/* Tab 3: Staff Presence */}
            {telemetryTab === "presence" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-1">
                  <span>Assigned Faculty</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{data.kpis.activeTeachers} Active</span>
                </div>
                <div className="space-y-2">
                  {(data.staffMembers && data.staffMembers.length > 0 ? data.staffMembers : [
                    { id: "1", name: "Head Teacher", role: "Administration", initials: "HT" },
                    { id: "2", name: "DOS Secular", role: "Curriculum Moderation", initials: "DS" },
                    { id: "3", name: "DOS Theology", role: "Islamic Studies", initials: "DT" },
                  ]).slice(0, 4).map((staff) => (
                    <div
                      key={staff.id}
                      className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="size-7 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
                          {staff.initials}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{staff.name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{staff.role}</div>
                        </div>
                      </div>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                  ))}
                </div>
                <Link
                  href="/admin/teachers"
                  className="block text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
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
