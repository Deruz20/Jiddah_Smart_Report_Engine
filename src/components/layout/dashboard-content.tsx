"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  Users,
  Settings,
  FileText,
  AlertTriangle,
  Printer,
  Pencil,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export interface ClassReportingStatus {
  className: string;
  totalStudents: number;
  marksEntered: number;
  totalRequired: number;
  missingMarks: number;
  stage: 'marks_in' | 'checked' | 'remarks' | 'approved' | 'printed';
  stageLabel: string;
  percent: number;
  anomalies: number;
}

export interface DashboardData {
  role: 'admin' | 'dos' | 'teacher';
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
  const { role, kpis, classStatuses, themeSettings } = data;
  const isTeacher = role === 'teacher';
  const isDOS = role === 'dos';
  const isAdmin = role === 'admin';

  const [stageFilter, setStageFilter] = useState<'all' | 'needs_action' | 'ready'>('all');

  const accentColor = themeSettings?.safeThemeColor || '#0F4D25';

  const totalMissingMarks = kpis.missingMarks ?? 0;
  const totalAnomalies = kpis.totalAnomalies ?? 0;
  const totalStudents = kpis.totalStudents ?? 0;

  const overallCyclePercent = useMemo(() => {
    const totalRequired = classStatuses.reduce((acc, curr) => acc + curr.totalRequired, 0);
    const totalEntered = classStatuses.reduce((acc, curr) => acc + curr.marksEntered, 0);
    if (totalRequired === 0) return 0;
    return Math.min(100, Math.round((totalEntered / totalRequired) * 100));
  }, [classStatuses]);

  const pendingClasses = useMemo(() => {
    return classStatuses.filter((c) => c.missingMarks > 0);
  }, [classStatuses]);

  const nextAction = useMemo(() => {
    if (classStatuses.length === 0 || totalStudents === 0) {
      return {
        title: "No Enrolled Students In Active Cohorts",
        description: "Enroll students and configure circular classes to initialize the reporting cycle.",
        actionText: "Manage Students",
        actionHref: "/admin/students",
        badge: "Setup Required",
        accent: "border-stone-300 bg-[#FAF7F2]",
      };
    }

    if (totalMissingMarks > 0) {
      const classNames = pendingClasses.map((c) => c.className).slice(0, 3).join(", ");
      const more = pendingClasses.length > 3 ? ` +${pendingClasses.length - 3} more` : "";
      return {
        title: `${totalMissingMarks} Pending Scores in ${classNames}${more}`,
        description: `Pending subject scores across ${pendingClasses.length} class${pendingClasses.length === 1 ? '' : 'es'}. Submit remaining marks to unlock verification.`,
        actionText: "Enter Pending Marks",
        actionHref: "/admin/marks",
        badge: isTeacher ? "Teacher Action Required" : isDOS ? "Moderation Queue" : "Cycle Milestone",
        accent: "border-amber-400 bg-amber-50/70",
      };
    }

    if (totalAnomalies > 0) {
      return {
        title: `${totalAnomalies} Score Outliers Require Review`,
        description: "Scores exceeding 100 or negative marks were flagged in the database. Verify before moderation.",
        actionText: "Review Anomalies",
        actionHref: "/admin/marks",
        badge: "Quality Audit",
        accent: "border-rose-300 bg-rose-50/70",
      };
    }

    return {
      title: `Reporting Cycle: ${overallCyclePercent}% Marks Recorded · ${themeSettings.currentTerm}`,
      description: `All subject marks are recorded for the current term. Report cards can be previewed and compiled in the Report Center.`,
      actionText: "Open Report Center",
      actionHref: "/admin/reports",
      badge: "Cycle Ready",
      accent: "border-[#CCE7D3] bg-[#FAF8F5]",
    };
  }, [classStatuses, totalStudents, totalMissingMarks, totalAnomalies, pendingClasses, isTeacher, isDOS, overallCyclePercent, themeSettings]);

  const filteredClasses = useMemo(() => {
    if (stageFilter === 'needs_action') {
      return classStatuses.filter((c) => c.missingMarks > 0 || c.anomalies > 0);
    }
    if (stageFilter === 'ready') {
      return classStatuses.filter((c) => c.percent === 100);
    }
    return classStatuses;
  }, [classStatuses, stageFilter]);

  return (
    <div className="w-full min-h-screen bg-[#FFFDF9] text-[#1C1917] p-3 sm:p-6 lg:p-8 pb-28 sm:pb-12 font-sans tabular-nums">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* 1. HEADER & SETTINGS STATUS */}
        <header className="border-b border-[#E7E2D7] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-[#EFE9DF] text-[#44403C] border border-[#E0D7C7]">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: accentColor }} />
                Reporting-Cycle Control Room
              </span>
              <span className="text-xs font-medium text-[#44403C]">
                Active cycle: {themeSettings.currentTerm} · Academic year {themeSettings.currentYear}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#1C1917] font-serif">
              {isAdmin ? "School Reporting Control Room" : isDOS ? "Academic Moderation Dashboard" : "Teacher Reporting Workstation"}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#57534E]">
              Track live mark submissions, pending class approvals, and score anomalies across cohorts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => router.push("/admin/marks")}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D6CEBF] bg-[#FFFFFF] hover:bg-[#F8F5EE] text-sm font-semibold text-[#1C1917] shadow-sm transition-all cursor-pointer"
            >
              <Pencil className="w-4 h-4" style={{ color: accentColor }} />
              Marks Entry
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/reports")}
              style={{ backgroundColor: accentColor }}
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl hover:opacity-90 text-sm font-bold text-white shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-white" />
              Report Center
            </button>
          </div>
                </header>

        {/* Mobile Quick Action Shortcuts (Compact, Vibrant & Fast) */}
        <div className="flex md:hidden items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => router.push("/admin/marks")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shrink-0 shadow-xs active:scale-95 transition"
          >
            <Pencil className="w-3.5 h-3.5 text-emerald-600" />
            <span>Marks Entry</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/reports")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shrink-0 shadow-xs active:scale-95 transition"
          >
            <Printer className="w-3.5 h-3.5 text-amber-600" />
            <span>Report Center</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/students")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold shrink-0 shadow-xs active:scale-95 transition"
          >
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Students</span>
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/settings")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 text-stone-800 border border-stone-200 text-xs font-bold shrink-0 shadow-xs active:scale-95 transition"
          >
            <Settings className="w-3.5 h-3.5 text-stone-600" />
            <span>Settings</span>
          </button>
        </div>

        {/* 2. CURRENT TERM MARKS OVERVIEW */}
        <section aria-labelledby="pipeline-heading" className="rounded-2xl border border-[#E7E2D7] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 id="pipeline-heading" className="text-base sm:text-lg font-bold text-[#1C1917] font-serif flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" style={{ color: accentColor }} />
                Current term marks overview
              </h2>
              <p className="text-xs text-[#57534E] mt-0.5">
                Live subject mark entries across secular and theology cohorts for {themeSettings.currentTerm}.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <span className="text-xs font-semibold text-[#57534E]">Cycle completion</span>
              <span
                className="text-lg font-black px-3 py-1 rounded-lg border"
                style={{
                  color: accentColor,
                  backgroundColor: '#EAF5EE',
                  borderColor: '#CCE7D3',
                }}
              >
                {overallCyclePercent}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="h-3 w-full bg-[#EAE4D9] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${overallCyclePercent}%`,
                  backgroundColor: accentColor,
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between text-xs text-[#57534E] pt-1">
              <span>{classStatuses.filter(c => c.percent === 100).length} of {classStatuses.length} cohorts complete</span>
              <span>{totalMissingMarks > 0 ? `${totalMissingMarks} pending score entries` : 'All marks recorded'}</span>
            </div>
          </div>
        </section>

        {/* 3. NEXT ACTION COMMAND BANNER */}
        <section aria-labelledby="action-banner-heading" className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${nextAction.accent}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1C1917] text-white">
                  {nextAction.badge}
                </span>
                <span className="text-xs font-semibold text-[#44403C]">Priority Action</span>
              </div>
              <h2 id="action-banner-heading" className="text-lg sm:text-xl font-black text-[#1C1917] font-serif">
                {nextAction.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#44403C] max-w-3xl">
                {nextAction.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(nextAction.actionHref)}
              style={{ backgroundColor: accentColor }}
              className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl hover:opacity-90 text-white text-sm font-bold shadow transition-all shrink-0 self-start lg:self-auto cursor-pointer"
            >
              {nextAction.actionText}
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </section>

        {/* 4. KEY METRICS: REPORTING CONTROL ROOM CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {/* 1. Missing Marks (Warm Amber/Gold) */}
          <div className="rounded-2xl border border-amber-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">Missing Marks</span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{totalMissingMarks}</div>
            <p className="text-[11px] sm:text-xs font-semibold text-amber-800 mt-1 truncate">
              {pendingClasses.length > 0 ? `Across ${pendingClasses.length} cohorts` : 'All marks submitted'}
            </p>
          </div>

          {/* 2. Score Anomalies (Ruby Red) */}
          <div className="rounded-2xl border border-rose-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-900">Anomalies</span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">{totalAnomalies}</div>
            <p className="text-[11px] sm:text-xs font-semibold text-rose-800 mt-1 truncate">
              {totalAnomalies === 0 ? 'Zero outliers detected' : 'Outliers >100 or <0'}
            </p>
          </div>

          {/* 3. Pending Approvals (Sapphire Blue) */}
          <div className="rounded-2xl border border-blue-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-900">Cohorts</span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-700">{pendingClasses.length}</div>
            <p className="text-[11px] sm:text-xs font-semibold text-blue-800 mt-1 truncate">
              {pendingClasses.length === 0 ? 'All verified for print' : 'Awaiting verification'}
            </p>
          </div>

          {/* 4. Total Enrolled (Emerald Green) */}
          <div className="rounded-2xl border border-emerald-200/80 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition">
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-900">Enrolled</span>
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700">{totalStudents}</div>
            <p className="text-[11px] sm:text-xs font-semibold text-emerald-800 mt-1 truncate">
              Active candidates
            </p>
          </div>
        </div>

        {/* 5. PER-CLASS PROGRESSION TABLE & ANOMALY ALERTS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-[#E7E2D7] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1C1917] font-serif">Class Reporting Progress</h2>
                <p className="text-xs text-[#57534E]">Progress of subject mark submissions per cohort from live database.</p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#F8F5EE] border border-[#E7E2D7] rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStageFilter('all')}
                  className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    stageFilter === 'all'
                      ? 'bg-white text-[#1C1917] shadow-sm'
                      : 'text-[#44403C] hover:text-[#1C1917]'
                  }`}
                >
                  All ({classStatuses.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('needs_action')}
                  className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    stageFilter === 'needs_action'
                      ? 'bg-white text-amber-800 shadow-sm'
                      : 'text-[#44403C] hover:text-amber-800'
                  }`}
                >
                  Pending ({classStatuses.filter((c) => c.missingMarks > 0 || c.anomalies > 0).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('ready')}
                  className={`min-h-[44px] px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    stageFilter === 'ready'
                      ? 'bg-white shadow-sm'
                      : 'text-[#44403C] hover:text-[#1C1917]'
                  }`}
                  style={stageFilter === 'ready' ? { color: accentColor } : undefined}
                >
                  Ready ({classStatuses.filter((c) => c.percent === 100).length})
                </button>
              </div>
            </div>

            {classStatuses.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#D6CEBF] bg-[#FAF8F5]">
                <ClipboardCheck className="w-10 h-10 mx-auto text-[#78716C] mb-3" />
                <h3 className="text-base font-bold text-[#1C1917]">No Active Cohorts Found</h3>
                <p className="text-xs text-[#57534E] max-w-sm mx-auto mt-1">
                  There are no classes or active enrollments in the database for the current academic term.
                </p>
                <button
                  type="button"
                  onClick={() => router.push('/admin/students')}
                  style={{ backgroundColor: accentColor }}
                  className="mt-4 min-h-[44px] px-5 py-2.5 rounded-xl text-white text-xs font-bold shadow hover:opacity-90 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Enroll Students
                </button>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8 px-4 rounded-xl border border-dashed border-[#D6CEBF] bg-[#FAF8F5]">
                <p className="text-xs text-[#57534E]">No classes match the selected filter.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClasses.map((c) => (
                  <div
                    key={c.className}
                    className="p-3.5 sm:p-4 rounded-xl border border-[#EFE9DF] bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-[#1C1917]">{c.className}</span>
                        <span className="text-xs text-[#44403C]">({c.totalStudents} students)</span>
                        {c.anomalies > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3" />
                            {c.anomalies} Anomaly
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            c.percent === 100
                              ? 'bg-[#EAF5EE] text-[#0F4D25] border border-[#CCE7D3]'
                              : c.missingMarks > 0
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {c.stageLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => router.push(c.missingMarks > 0 ? '/admin/marks' : '/admin/reports')}
                          className="min-h-[44px] px-3 text-xs font-bold hover:underline inline-flex items-center gap-0.5 ml-1 cursor-pointer rounded-lg"
                          style={{ color: accentColor }}
                          aria-label={`Open ${c.className}`}
                        >
                          Action <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="w-full bg-[#EAE4D9] rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${c.percent}%`,
                          backgroundColor: c.percent === 100 ? accentColor : '#D97706',
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#44403C] mt-1.5 font-medium">
                      <span>
                        {c.totalStudents === 0
                          ? 'No enrolled candidates'
                          : c.missingMarks === 0
                          ? 'All required core marks recorded'
                          : `${c.missingMarks} marks remaining`}
                      </span>
                      <span>{c.percent}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-[#E7E2D7] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <h3 className="font-bold text-sm text-[#1C1917] font-serif">Anomaly Watchlist</h3>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  {totalAnomalies} Flags
                </span>
              </div>

              {totalAnomalies === 0 ? (
                <div className="p-4 rounded-xl border border-[#E7E2D7] bg-[#FAF8F5] text-center text-xs text-[#57534E]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  <p className="font-semibold text-[#1C1917]">Integrity Check Passed</p>
                  <p className="text-[11px] mt-0.5 text-[#57534E]">Zero out-of-scale or corrupted scores detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/40 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-rose-900">
                      <span>Score Outliers Detected</span>
                      <span className="text-[10px] text-rose-700 font-semibold">{totalAnomalies} Marks</span>
                    </div>
                    <p className="text-[#57534E]">
                      Marks recorded with values outside the 0–100 scale require review before report generation.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push('/admin/marks')}
                className="w-full mt-4 min-h-[44px] py-2.5 text-center text-xs font-bold rounded-xl transition-colors border cursor-pointer"
                style={{
                  color: accentColor,
                  backgroundColor: '#EAF5EE',
                  borderColor: '#CCE7D3',
                }}
              >
                Inspect Anomalies in Marks Entry
              </button>
            </div>

            <div className="rounded-2xl border border-[#E7E2D7] bg-[#FFFFFF] p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                <h3 className="font-bold text-sm text-[#1C1917] font-serif">Cycle Cutoffs</h3>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE9DF]">
                  <div className="p-1.5 rounded-lg bg-white border border-[#E0D7C7] text-[#44403C] shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-[#1C1917]">Term Ending Cutoff</p>
                    <p className="text-[#57534E] text-[11px]">{data.upcomingEvents?.[0]?.date || 'Term Ongoing'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#FAF8F5] border border-[#EFE9DF]">
                  <div className="p-1.5 rounded-lg bg-white border border-[#E0D7C7] text-[#44403C] shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-[#1C1917]">Report Release Window</p>
                    <p className="text-[#57534E] text-[11px]">Follows teacher score verification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
