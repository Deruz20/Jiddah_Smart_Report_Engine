"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ExamBreakdownTelemetry } from "@/lib/dashboard-telemetry";
import { MARKS_UPDATED_EVENT, OFFLINE_SYNC_EVENT } from "@/lib/offline-sync";
import { invalidateClientCache } from "@/lib/client-cache";
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
import { UnassignedTeacherState } from "@/components/UnassignedTeacherState";

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
  department?: "secular" | "theology" | "both";
  isUnassigned?: boolean;
  canAccessReports?: boolean;
  canAccessStudents?: boolean;
  canManageTeachers?: boolean;
  canViewAuditLogs?: boolean;
  kpis: {
    totalStudents: number;
    activeTeachers: number;
    reportsGenerated: number;
    avgAttendance: number;
    missingMarks: number;
    totalAnomalies: number;
    readyToPrintCount: number;
  };
  examBreakdown?: ExamBreakdownTelemetry;
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
  const [liveData, setLiveData] = useState<DashboardData>(data);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setLiveData(data);
  }, [data]);

  const refreshTelemetry = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsRefreshing(true);
    try {
      invalidateClientCache();
      const res = await fetch("/api/analytics/dashboard", { cache: "no-store" });
      if (res.ok) {
        const fresh = await res.json();
        setLiveData((prev) => ({
          ...prev,
          kpis: {
            ...prev.kpis,
            ...(fresh.kpis || {}),
          },
          examBreakdown: fresh.examBreakdown ?? prev.examBreakdown,
          classStatuses: Array.isArray(fresh.classStatuses) ? fresh.classStatuses : prev.classStatuses,
          recentActivity: Array.isArray(fresh.recentActivity) ? fresh.recentActivity : prev.recentActivity,
          notifications: Array.isArray(fresh.notifications) ? fresh.notifications : prev.notifications,
          classPerformance: Array.isArray(fresh.classPerformance) ? fresh.classPerformance : prev.classPerformance,
        }));
      }
      router.refresh();
    } catch {
      // Keep current snapshot if offline
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    const onMarksUpdated = () => {
      refreshTelemetry();
    };
    const onSyncChanged = (event: Event) => {
      const custom = event as CustomEvent<{ isSyncing?: boolean; pendingCount?: number }>;
      if (custom.detail && custom.detail.isSyncing === false && custom.detail.pendingCount === 0) {
        refreshTelemetry();
      }
    };
    window.addEventListener(MARKS_UPDATED_EVENT, onMarksUpdated);
    window.addEventListener(OFFLINE_SYNC_EVENT, onSyncChanged);
    return () => {
      window.removeEventListener(MARKS_UPDATED_EVENT, onMarksUpdated);
      window.removeEventListener(OFFLINE_SYNC_EVENT, onSyncChanged);
    };
  }, [refreshTelemetry]);

  const { role, kpis, classStatuses, themeSettings, recentActivity, notifications, examBreakdown } = liveData;
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
      if (data.isUnassigned) {
        return {
          title: "Awaiting Class & Subject Assignment",
          desc: "Contact the Administrator or Director of Studies (DOS) to assign your class cohorts and subject pairs.",
          ctaText: "Open Marks Entry",
          ctaHref: "/admin/marks",
          badge: "Assignment Pending",
        };
      }
      return {
        title: "Initialize Academic Term Roster",
        desc: "No active student enrollments found. Enroll students or configure classes to begin term tracking.",
        ctaText: data.canAccessStudents !== false ? "Enroll Students" : "View Subjects",
        ctaHref: data.canAccessStudents !== false ? "/admin/students" : "/admin/subjects",
        badge: "Roster Setup",
      };
    }
    if (totalMissingMarks > 0) {
      const pendingClasses = classStatuses.filter((c) => c.missingMarks > 0);
      const sampleNames = pendingClasses.slice(0, 2).map((c) => c.className).join(", ");
      const more = pendingClasses.length > 2 ? ` +${pendingClasses.length - 2} more` : "";
      return {
        title: `${totalMissingMarks} pupils in ${sampleNames}${more} are missing scores — report cards will print with blank grades`,
        desc: "Complete pending mark sheets now to ensure report dossiers print with verified grades and term positioning.",
        ctaText: `Enter ${totalMissingMarks} Missing Scores →`,
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
      ctaText: data.canAccessReports !== false ? "Open Report Studio" : "Review Marks",
      ctaHref: data.canAccessReports !== false ? "/admin/reports/studio" : "/admin/marks",
      badge: "Ready for Compilation",
    };
  }, [classStatuses, totalStudents, totalMissingMarks, totalAnomalies, isTeacher, overallCyclePercent, data.isUnassigned, data.canAccessStudents, data.canAccessReports]);

  // Assessment Distribution for Donut Chart
  const totalRequiredAll = classStatuses.reduce((acc, curr) => acc + curr.totalRequired, 0);
  const totalEnteredAll = classStatuses.reduce((acc, curr) => acc + curr.marksEntered, 0);
  const recordedRatio = totalRequiredAll > 0 ? totalEnteredAll / totalRequiredAll : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - recordedRatio * circumference;

  const curveGeometry = useMemo(() => {
    const botAvg = examBreakdown?.bot?.averageScore ?? null;
    const motAvg = examBreakdown?.mot?.averageScore ?? null;
    const eotAvg = examBreakdown?.eot?.averageScore ?? null;

    const rawPoints: Array<{ x: number; avg: number | null; label: string }> = [
      { x: 12, avg: botAvg, label: "BOT" },
      { x: 120, avg: motAvg, label: "MOT" },
      { x: 228, avg: eotAvg, label: "EOT" },
    ];
    const validPoints = rawPoints.filter((p): p is { x: number; avg: number; label: string } => p.avg !== null);

    if (validPoints.length === 0) {
      return {
        hasData: false,
        linePath: "M 0 68 L 240 68",
        areaPath: "M 0 68 L 240 68 L 240 80 L 0 80 Z",
        dots: [] as Array<{ x: number; y: number }>,
        deltaLabel: "Awaiting Scores",
        deltaPositive: true,
      };
    }

    const toY = (score: number) => {
      const clamped = Math.max(0, Math.min(100, score));
      return Math.round(70 - (clamped / 100) * 56);
    };

    const coords =
      validPoints.length === 1
        ? [
            { x: 0, y: toY(validPoints[0].avg) },
            { x: validPoints[0].x, y: toY(validPoints[0].avg) },
            { x: 240, y: toY(validPoints[0].avg) },
          ]
        : [
            { x: 0, y: toY(validPoints[0].avg) },
            ...validPoints.map((p) => ({ x: p.x, y: toY(p.avg) })),
            ...(validPoints[validPoints.length - 1].x < 240
              ? [{ x: 240, y: toY(validPoints[validPoints.length - 1].avg) }]
              : []),
          ];

    const linePath = coords.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");
    const areaPath = `${linePath} L 240 80 L 0 80 Z`;
    const delta = examBreakdown?.progressionDelta ?? null;
    const deltaLabel =
      delta === null
        ? "Baseline"
        : delta > 0
        ? `+${delta} pts`
        : delta < 0
        ? `${delta} pts`
        : "0.0 pts";

    return {
      hasData: true,
      linePath,
      areaPath,
      dots: validPoints.map((p) => ({ x: p.x, y: toY(p.avg) })),
      deltaLabel,
      deltaPositive: delta === null || delta >= 0,
    };
  }, [examBreakdown]);

  return (
    <div className="w-full min-h-full pt-4 sm:pt-6 px-3 sm:px-5 lg:px-6 pb-6 space-y-4 lg:space-y-5 max-w-[1500px] mx-auto font-sans transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E4EAE6] dark:border-[#1E2B26]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30">
              <ShieldCheck className="size-3" strokeWidth={2} />
              Command Center
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {themeSettings.currentTerm} • Academic Year {themeSettings.currentYear}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
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

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshTelemetry}
            disabled={isRefreshing}
            title="Refresh live telemetry"
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151922] hover:bg-slate-50 dark:hover:bg-[#1A1F2C] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3.5 text-slate-500", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/admin/marks"
            className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#151922] hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-[#1A1F2C] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 transition-all shadow-xs"
          >
            <ClipboardEdit className="size-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
            <span>Enter Marks</span>
          </Link>
          {liveData.canAccessReports !== false && (
            <Link
              href="/admin/reports/studio"
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-lime-500 dark:text-slate-950 font-black text-xs flex items-center gap-2 hover:brightness-105 active:scale-95 transition-all shadow-md"
            >
              <Sparkles className="size-3.5" strokeWidth={2.2} />
              <span>Report Studio</span>
            </Link>
          )}
        </div>
      </div>

      {data.isUnassigned && (
        <UnassignedTeacherState
          moduleName="Dashboard & Cohort Telemetry"
          department={data.department || "both"}
          roleLabel={isTeacher ? "Teacher" : "Staff"}
        />
      )}

      {/* ─── ZONE 1: 4 CENTER TOP KPI CARDS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Marks Completion Rate Ring */}
        <div className="p-4 rounded-3xl card-jiddah border border-[#D97706]/18 dark:border-[#F59E0B]/16 flex items-center justify-between shadow-xs">
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
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium tabular-nums">
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
            <span className="absolute text-[10px] font-black text-slate-800 dark:text-slate-200 tabular-nums">
              {overallCyclePercent}%
            </span>
          </div>
        </div>

        {/* KPI 2: Active Students */}
        <div className="p-4 rounded-3xl card-jiddah border border-[#D97706]/18 dark:border-[#F59E0B]/16 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="size-3.5" strokeWidth={2} />
              Enrolled Learners
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {totalStudents}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium tabular-nums">
              <span>{classStatuses.length} cohorts active</span>
              <span className="size-1 rounded-full bg-slate-400" />
              <span className="text-sky-700 dark:text-sky-400 font-semibold">
                {data.department === "theology"
                  ? "Theology Track"
                  : data.department === "secular"
                    ? "Secular Track"
                    : "Secular & Theology"}
              </span>
            </div>
          </div>
          <div className="size-11 rounded-xl bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
            <GraduationCap className="size-5" strokeWidth={1.8} />
          </div>
        </div>

        {/* KPI 3: Report Dossiers Ready */}
        <div className="p-4 rounded-3xl card-jiddah border border-[#D97706]/18 dark:border-[#F59E0B]/16 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="size-3.5" strokeWidth={2} />
              Report Dossiers
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {reportsGenerated}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium tabular-nums">
              {totalMissingMarks === 0 ? "Ready for batch print" : `${totalMissingMarks} scores remaining`}
            </p>
          </div>
          <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <Printer className="size-5" strokeWidth={1.8} />
          </div>
        </div>

        {/* KPI 4: Active Teaching Staff */}
        <div className="p-4 rounded-3xl card-jiddah border border-[#D97706]/18 dark:border-[#F59E0B]/16 flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" strokeWidth={2} />
              Staff Deployment
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {activeTeachers}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium tabular-nums">
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
                      strokeDashoffset={238.76 - (totalRequiredAll > 0 ? (totalEnteredAll / totalRequiredAll) * 238.76 : 0)}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <div className="text-sm font-black text-slate-900 dark:text-white tabular-nums">{overallCyclePercent}%</div>
                    <div className="text-[8px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">Captured</div>
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                      BOT ({examBreakdown?.bot?.completionPct ?? 0}% • {examBreakdown?.bot?.entered ?? 0})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-sky-600 dark:bg-sky-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                      MOT ({examBreakdown?.mot?.completionPct ?? 0}% • {examBreakdown?.mot?.entered ?? 0})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                    <span className="text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                      EOT ({examBreakdown?.eot?.completionPct ?? 0}% • {examBreakdown?.eot?.entered ?? 0})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-slate-200/90 dark:border-[#212634] flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Cohort Performance Curve</h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Live mean progression across term exams</p>
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-bold tabular-nums",
                    !curveGeometry.hasData
                      ? "text-slate-500 dark:text-slate-400"
                      : curveGeometry.deltaPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  )}
                >
                  <TrendingUp className="size-3" strokeWidth={2.2} />
                  <span>{curveGeometry.deltaLabel}</span>
                </div>
              </div>

              <div className="h-20 w-full relative flex items-end">
                <svg className="w-full h-18 overflow-visible" preserveAspectRatio="none" viewBox="0 0 240 80">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={curveGeometry.hasData ? "#10B981" : "#94A3B8"} stopOpacity="0.32" />
                      <stop offset="100%" stopColor={curveGeometry.hasData ? "#10B981" : "#94A3B8"} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d={curveGeometry.areaPath} fill="url(#areaGradient)" />
                  <path
                    d={curveGeometry.linePath}
                    fill="none"
                    stroke={curveGeometry.hasData ? "#10B981" : "#94A3B8"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={curveGeometry.hasData ? undefined : "4 4"}
                  />
                  {curveGeometry.dots.map((dot, idx) => (
                    <circle key={idx} cx={dot.x} cy={dot.y} r={3.5} fill="#84CC16" />
                  ))}
                </svg>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-white/5 font-medium tabular-nums">
                <span>
                  BOT {examBreakdown?.bot?.averageScore !== null && examBreakdown?.bot?.averageScore !== undefined ? `${examBreakdown.bot.averageScore}%` : "N/A"}
                </span>
                <span>
                  MOT {examBreakdown?.mot?.averageScore !== null && examBreakdown?.mot?.averageScore !== undefined ? `${examBreakdown.mot.averageScore}%` : "N/A"}
                </span>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                  EOT {examBreakdown?.eot?.averageScore !== null && examBreakdown?.eot?.averageScore !== undefined ? `${examBreakdown.eot.averageScore}%` : "Pending"}
                </span>
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
              className="h-9 px-4 rounded-full btn-jiddah-cta text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition-all shadow-md"
            >
              <span>{nextAction.ctaText}</span>
              <ArrowRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          {/* ─── ZONE 3: CLASS REPORTING STATUS TABLE ─────────────── */}
          <div className="rounded-3xl card-jiddah border border-[#D97706]/18 dark:border-[#F59E0B]/16 overflow-hidden shadow-xs">
            {/* Table Header & Filter Bar */}
            <div className="p-3.5 sm:p-4 border-b border-[#0D5C3A]/[0.07] dark:border-[#F59E0B]/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Class Reporting Breakdown</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Per-cohort verification, completion rates, and outlier audits.
                </p>
              </div>

              <div className="overflow-x-auto no-scrollbar max-w-full flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={cn(
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer",
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
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer",
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
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer",
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
                  <tr className="border-b border-[#0D5C3A]/[0.07] dark:border-[#F59E0B]/[0.07] bg-slate-50 dark:bg-[#161A23] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3.5">Class / Cohort</th>
                    <th className="py-2.5 px-3.5">Learners</th>
                    <th className="py-2.5 px-3.5">Marks Progress</th>
                    <th className="py-2.5 px-3.5">Audit Status</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0D5C3A]/[0.07] dark:divide-[#F59E0B]/[0.07]">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                        No cohorts matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map((cls, idx) => {
                      const displayPercent = Math.min(100, Math.round(15 + (cls.percent / 100) * 85));
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors group">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            <span>{cls.className}</span>
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-300 font-medium tabular-nums">
                            {cls.totalStudents} pupils
                          </td>
                          <td className="py-2.5 px-3.5 min-w-[140px]">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                                <span className="text-slate-800 dark:text-slate-300 font-bold">
                                  {cls.percent === 100 ? "100%" : `${displayPercent}%`}
                                </span>
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
                                  style={{ width: `${cls.percent === 100 ? 100 : displayPercent}%` }}
                                />
                              </div>
                              {cls.missingMarks > 0 && cls.missingMarks <= 6 && (
                                <span className="pill-jiddah-gold px-2 py-0.5 rounded-full text-[10px] font-bold text-white inline-block tabular-nums animate-pulse">
                                  Only {cls.missingMarks} left to complete!
                                </span>
                              )}
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
                    );
                  })
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
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-white/5">
              <div className="overflow-x-auto no-scrollbar max-w-full flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTelemetryTab("notifications")}
                  className={cn(
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1.5",
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
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer",
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
                    "whitespace-nowrap shrink-0 px-3 py-1 rounded-full transition-colors cursor-pointer",
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
                {data.canViewAuditLogs !== false && (
                  <Link
                    href="/admin/activity"
                    className="block text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
                  >
                    View Complete Audit Log →
                  </Link>
                )}
              </div>
            )}

            {/* Tab 3: Staff Presence */}
            {telemetryTab === "presence" && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 pb-1">
                  <span>Assigned Faculty</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{kpis.activeTeachers} Active</span>
                </div>
                <div className="space-y-2">
                  {(!liveData.staffMembers || liveData.staffMembers.length === 0) ? (
                    <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                      No active faculty records found.
                    </div>
                  ) : (
                    liveData.staffMembers.slice(0, 4).map((staff) => (
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
                    ))
                  )}
                </div>
                {data.canManageTeachers !== false && (
                  <Link
                    href="/admin/teachers"
                    className="block text-center text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline pt-1"
                  >
                    Manage Faculty Roster →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
