"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Users,
  TrendingUp,
  FileText,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  BookOpen,
  Clock,
  ClipboardEdit,
  Printer,
  UserPlus,
  ChevronRight,
} from "lucide-react";

/* ─── Data ────────────────────────────────────────────────────────────────── */

export interface DashboardData {
  kpis: {
    totalStudents: number;
    avgScore: number;
    reports: number;
    topPerformers: number;
  };
  recentActivity: {
    name: string;
    grade: string;
    score: number;
    subject: string;
    time: string;
  }[];
  classes: {
    name: string;
    students: number;
    completion: number;
    teacher: string;
  }[];
  chartData: {
    overview: { name: string; score: number; avg: number }[];
    gender: { subject: string; Boys: number; Girls: number }[];
    performance: { subject: string; circular: number; theology: number; fullMark: number }[];
  };
}

const quickActions = [
  { label: "Add Marks", icon: ClipboardEdit, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
  { label: "New Report", icon: Printer, color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.15)" },
  { label: "Add Student", icon: UserPlus, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
  { label: "View All", icon: FileText, color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.15)" },
];

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({ label, value, change, up, icon: Icon, gradient, bg, iconColor }: {
  label: string;
  value: string | number;
  change: string;
  up: boolean;
  icon: React.ElementType;
  gradient: string;
  bg: string;
  iconColor: string;
}) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative bg-white rounded-2xl p-4 border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden cursor-default"
    >
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-6 bg-gradient-to-br ${gradient} -translate-y-6 translate-x-6`} />
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center justify-center size-8 rounded-xl ${bg}`}>
          <Icon className={`size-4 ${iconColor}`} strokeWidth={1.8} />
        </div>
        <span
          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}
          style={{ fontSize: "0.68rem" }}
        >
          {up ? <ArrowUpRight className="size-2.5" strokeWidth={2.5} /> : <ArrowDownRight className="size-2.5" strokeWidth={2.5} />}
          {change}
        </span>
      </div>
      <p className="text-slate-900" style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </p>
      <p className="text-slate-400 mt-1" style={{ fontSize: "0.72rem" }}>
        {label}
      </p>
    </motion.div>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
    score >= 75 ? "bg-blue-50 text-blue-600 border-blue-100" :
    "bg-orange-50 text-orange-600 border-orange-100";
  return (
    <span className={`px-2 py-0.5 rounded-lg border font-semibold ${color}`} style={{ fontSize: "0.75rem" }}>
      {score}%
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 85 ? "#10b981" : value >= 70 ? "#10b981" : "#f97316";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
      <span className="text-slate-400 w-7 text-right shrink-0" style={{ fontSize: "0.7rem" }}>{value}%</span>
    </div>
  );
}

import { OverviewChart } from "./charts/overview-chart";
import { GenderChart } from "./charts/gender-chart";
import { PerformanceComparisonChart } from "./charts/performance-comparison-chart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/figma-ui/ui/tabs";

/* ─── Main Component ──────────────────────────────────────────────────────── */

export function DashboardContent({ data }: { data: DashboardData }) {
  const stats = [
    { label: "Total Students", value: data.kpis.totalStudents.toString(), change: "+12%", up: true, icon: Users, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", iconColor: "text-emerald-500" },
    { label: "Avg. Score", value: `${data.kpis.avgScore}%`, change: "+3.2%", up: true, icon: TrendingUp, gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", iconColor: "text-emerald-500" },
    { label: "Reports", value: data.kpis.reports.toString(), change: "+28", up: true, icon: FileText, gradient: "from-orange-500 to-amber-600", bg: "bg-orange-50", iconColor: "text-orange-500" },
    { label: "Top Performers", value: data.kpis.topPerformers.toString(), change: "-4", up: false, icon: Award, gradient: "from-rose-500 to-pink-600", bg: "bg-rose-50", iconColor: "text-rose-500" },
  ];
  const { recentActivity, classes } = data;

  return (
    <div
      className="flex flex-col gap-4 md:gap-6 p-4 md:p-6 max-w-[1400px]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%)",
          boxShadow: "0 4px 24px rgba(15,23,42,0.18)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 60%, rgba(16,185,129,0.45) 0%, transparent 45%), radial-gradient(circle at 85% 20%, rgba(249,115,22,0.35) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 p-4 md:p-6">
          {/* Mobile layout: stacked */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-slate-400 mb-0.5" style={{ fontSize: "0.75rem" }}>Good morning,</p>
              <h1 className="text-white mb-1" style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
                Admin Hassan 👋
              </h1>
              <p className="text-slate-400" style={{ fontSize: "0.78rem", lineHeight: 1.5 }}>
                Term 1, 2026 · Week 24
              </p>
            </div>

            {/* Action button */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="flex items-center justify-center gap-2 self-start md:self-auto px-4 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                boxShadow: "0 4px 14px rgba(249,115,22,0.45)",
                fontSize: "0.82rem",
                fontWeight: 500,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <FileText className="size-3.5" strokeWidth={2} />
              Generate Reports
            </motion.button>
          </div>

          {/* Pending alert — mobile friendly */}
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.25)" }}
          >
            <div className="size-1.5 rounded-full bg-orange-400 animate-pulse shrink-0" />
            <span className="text-orange-200" style={{ fontSize: "0.75rem" }}>
              3 reports are pending your review
            </span>
            <ChevronRight className="size-3.5 text-orange-400/70 ml-auto shrink-0" strokeWidth={2.5} />
          </div>
        </div>
      </motion.div>

      {/* Quick actions (mobile-first horizontal scroll) */}
      <div className="md:hidden">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none" style={{ WebkitOverflowScrolling: "touch" }}>
          {quickActions.map(({ label, icon: Icon, color, bg, border }, i) => (
            <motion.button
              key={label}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              whileTap={{ scale: 0.94 }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl shrink-0 active:opacity-80 transition-all"
              style={{ background: bg, border: `1px solid ${border}`, WebkitTapHighlightColor: "transparent" }}
            >
              <Icon className="size-4 shrink-0" style={{ color }} strokeWidth={1.8} />
              <span style={{ fontSize: "0.78rem", color, fontWeight: 500 }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full mt-2">
        <TabsList className="w-full max-w-md grid grid-cols-4 bg-slate-100/50 p-1 mb-6">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="curriculum" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Curriculum</TabsTrigger>
          <TabsTrigger value="staff" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Staff</TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 + i * 0.06 }}
              >
                <StatCard {...stat} />
              </motion.div>
            ))}
          </div>

          {/* Overview Chart Section */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 md:p-6"
          >
            <div className="mb-4">
              <h3 className="text-slate-900" style={{ fontSize: "0.95rem", fontWeight: 600 }}>School Performance</h3>
              <p className="text-slate-400" style={{ fontSize: "0.75rem" }}>Average scores across all subjects over the term</p>
            </div>
            <OverviewChart data={data.chartData.overview} />
          </motion.div>

      {/* Two-column section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Recent mark entries */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.32 }}
          className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-slate-100">
            <div>
              <h3 className="text-slate-900" style={{ fontSize: "0.88rem", fontWeight: 600 }}>Recent Mark Entries</h3>
              <p className="text-slate-400" style={{ fontSize: "0.72rem" }}>Latest scores recorded today</p>
            </div>
            <button className="flex items-center justify-center size-8 rounded-lg text-slate-400 hover:bg-slate-100 active:bg-slate-100 transition-colors">
              <MoreHorizontal className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div className="divide-y divide-slate-50">
            {recentActivity.map((row, i) => (
              <motion.div
                key={row.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-3 px-4 md:px-5 py-3.5 hover:bg-slate-50/70 active:bg-slate-50 transition-colors cursor-default"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div
                  className="flex items-center justify-center size-9 rounded-xl text-white shrink-0"
                  style={{
                    background: `hsl(${(i * 57 + 230) % 360}, 65%, 55%)`,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    boxShadow: `0 2px 6px hsl(${(i * 57 + 230) % 360}, 65%, 55%, 0.25)`,
                  }}
                >
                  {row.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 truncate" style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                    {row.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <BookOpen className="size-2.5 text-slate-300 shrink-0" strokeWidth={2} />
                    <span className="text-slate-400 truncate" style={{ fontSize: "0.7rem" }}>
                      {row.grade} · {row.subject}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <ScorePill score={row.score} />
                  <div className="flex items-center gap-1">
                    <Clock className="size-2.5 text-slate-300" strokeWidth={2} />
                    <span className="text-slate-300" style={{ fontSize: "0.64rem" }}>{row.time}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* View all link */}
          <div className="px-4 md:px-5 py-3 border-t border-slate-50">
            <button className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-600 active:text-emerald-700 transition-colors" style={{ fontSize: "0.78rem", fontWeight: 500 }}>
              View all entries
              <ChevronRight className="size-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>

        {/* Report completion */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.37 }}
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-slate-100">
            <div>
              <h3 className="text-slate-900" style={{ fontSize: "0.88rem", fontWeight: 600 }}>Report Completion</h3>
              <p className="text-slate-400" style={{ fontSize: "0.72rem" }}>By class · Term 1</p>
            </div>
          </div>
          <div className="p-4 md:p-5 flex flex-col gap-4">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.45 + i * 0.06 }}
                className="flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-800" style={{ fontSize: "0.82rem", fontWeight: 500 }}>{cls.name}</p>
                    <p className="text-slate-400" style={{ fontSize: "0.68rem" }}>
                      {cls.teacher} · {cls.students} students
                    </p>
                  </div>
                </div>
                <ProgressBar value={cls.completion} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      </TabsContent>

        <TabsContent value="curriculum" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 md:p-6"
            >
              <div className="mb-4">
                <h3 className="text-slate-900" style={{ fontSize: "0.95rem", fontWeight: 600 }}>Curriculum Comparison</h3>
                <p className="text-slate-400" style={{ fontSize: "0.75rem" }}>Theology vs Circular Performance</p>
              </div>
              <PerformanceComparisonChart data={data.chartData.performance} />
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4 md:space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 md:p-6"
          >
            <div className="mb-4">
              <h3 className="text-slate-900" style={{ fontSize: "0.95rem", fontWeight: 600 }}>Staff Management</h3>
              <p className="text-slate-400" style={{ fontSize: "0.75rem" }}>Teacher performance and class assignments will be detailed here.</p>
            </div>
            <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Staff metrics coming soon...</div>
          </motion.div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-4 md:p-6"
            >
              <div className="mb-4">
                <h3 className="text-slate-900" style={{ fontSize: "0.95rem", fontWeight: 600 }}>Gender Performance Gap</h3>
                <p className="text-slate-400" style={{ fontSize: "0.75rem" }}>Average score comparison by gender across subjects</p>
              </div>
              <GenderChart data={data.chartData.gender} />
            </motion.div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
