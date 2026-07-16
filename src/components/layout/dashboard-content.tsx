"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  User,
  UserCheck,
  Pencil,
  FileText,
  TrendingUp,
  BookOpen,
  Calendar,
  Bell,
  ArrowRight,
  Printer,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

export interface DashboardData {
  role: 'admin' | 'dos' | 'teacher';
  kpis: {
    totalStudents: number;
    activeTeachers: number;
    reportsGenerated: number;
    avgAttendance: number;
  };
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
}

const upcomingEvents = [
  { title: "Term 3 Marks Deadline", date: "May 16, 2026", type: "deadline" },
  { title: "Primary 6 Graduation Ceremony", date: "May 28, 2026", type: "event" },
  { title: "Parent-Teacher Conference", date: "June 4, 2026", type: "meeting" },
  { title: "Academic Session Ends", date: "June 20, 2026", type: "term" },
];

const activityIcons: Record<string, typeof User> = {
  student: User,
  marks: Pencil,
  teacher: UserCheck,
  report: FileText,
  notification: Bell,
  system: AlertCircle,
};

export default function DashboardContent({ data }: { data: DashboardData }) {
  const router = useRouter();

  const { role } = data;
  const isTeacher = role === 'teacher';
  const isDOS = role === 'dos';
  const isAdmin = role === 'admin';

  const kpiCards = useMemo(() => {
    const k = data.kpis;
    const cards = [
      {
        label: isTeacher ? "My Students" : "Total Students",
        value: String(k.totalStudents),
        change: isTeacher ? "Assigned" : "Active enrollments",
        icon: Users,
        textClass: "text-emerald-600",
        bgClass: "bg-emerald-100",
      },
      ...(!isTeacher ? [{
        label: "Active Teachers",
        value: String(k.activeTeachers),
        change: isDOS ? "In Department" : "Currently active",
        icon: BookOpen,
        textClass: "text-emerald-900",
        bgClass: "bg-emerald-100",
      }] : []),
      {
        label: "Reports Generated",
        value: String(k.reportsGenerated),
        change: "Logged this term",
        icon: FileText,
        textClass: "text-indigo-600",
        bgClass: "bg-indigo-100",
      },
      ...(!isTeacher ? [{
        label: "Avg Attendance",
        value: `${k.avgAttendance}%`,
        change: isDOS ? "Dept average" : "School average",
        icon: TrendingUp,
        textClass: "text-pink-600",
        bgClass: "bg-pink-100",
      }] : [])
    ];
    return cards;
  }, [data, isTeacher, isDOS]);

  const title = isAdmin ? "Admin Dashboard" : isDOS ? "Department Overview" : "Teacher Dashboard";
  const subtitle = isAdmin 
    ? "Analytics, activity, and action cards for your school."
    : isDOS 
    ? "Analytics, activity, and action cards for your department."
    : "Manage your assigned classes and students.";

  const attendanceAverage = data.attendanceTrend.length
    ? Math.round(
        data.attendanceTrend.reduce((sum, item) => sum + Number(item.rate), 0) /
          data.attendanceTrend.length
      )
    : 0;

  return (
    <div className="w-full">
      <HeroSection
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <button
              onClick={() => router.push(isTeacher ? "/admin/marks" : "/admin/reports")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] text-sm font-semibold text-white"
            >
              {isTeacher ? <Pencil className="w-4 h-4" /> : <Printer className="w-4 h-4" />} 
              {isTeacher ? "Enter Marks" : "Generate Reports"}
            </button>
            {!isTeacher && (
              <button
                onClick={() => router.push("/admin/analytics")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                <BarChart3 className="w-4 h-4" /> View Analytics
              </button>
            )}
          </>
        }
      />

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 1, 0.5, 1] }}
              className="group relative rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden"
            >
              {/* Decorative background glow on hover */}
              <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${card.bgClass.replace('bg-', '')}`} />
              
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${card.bgClass} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className={`h-5 w-5 ${card.textClass}`} strokeWidth={2.5} />
                </div>
                <span className={`text-[11px] font-bold tracking-wide uppercase px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 ${card.textClass}`}>
                  {card.change}
                </span>
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">{card.value}</h2>
                <p className="mt-1 text-[13px] font-medium text-slate-500">{card.label}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {!isTeacher && (
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Attendance Trend</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-0.5">Monthly attendance data for the year.</p>
              </div>
              <span className="inline-flex self-start sm:self-auto rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-600 shadow-sm">
                Avg {attendanceAverage}%
              </span>
            </div>
            <div className="relative -ml-4 sm:ml-0">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.15)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)", padding: "12px" }}
                    itemStyle={{ color: "#0F172A", fontWeight: 600, fontSize: "13px" }}
                    labelStyle={{ color: "#64748B", fontSize: "12px", marginBottom: "4px" }}
                  />
                  <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={3} fill="url(#attendanceGrad)" activeDot={{ r: 6, strokeWidth: 0, fill: "#059669" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className={`rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-md transition-shadow duration-300 ${isTeacher ? 'lg:col-span-3' : ''}`}>
          <div className="mb-6">
            <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Class Performance</h3>
            <p className="text-[13px] font-medium text-slate-500 mt-0.5">Average score by class.</p>
          </div>
          <div className="relative -ml-4 sm:ml-0">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.classPerformance} layout="vertical" barSize={12} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748B", fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="class" tick={{ fontSize: 11, fill: "#64748B", fontWeight: 600 }} axisLine={false} tickLine={false} width={70} />
                <Tooltip 
                  cursor={{ fill: "rgba(241,245,249,0.5)" }}
                  contentStyle={{ borderRadius: "12px", border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="avg" fill="#10B981" radius={[0, 6, 6, 0]} activeBar={{ fill: "#059669" }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Recent Activity</h3>
              <p className="text-[13px] font-medium text-slate-500 mt-0.5">Latest administrative actions.</p>
            </div>
            <button onClick={() => router.push("/admin/activity")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3 text-slate-300">
                <AlertCircle size={20} />
              </div>
              <h3 className="text-[14px] font-bold text-slate-800">No activity recorded yet</h3>
              <p className="text-[13px] text-slate-400 mt-0.5">Administrative actions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((item, index) => {
                const Icon = activityIcons[item.entity_type] || AlertCircle;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="group flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-slate-100 bg-slate-50/30 p-4 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3 sm:w-full">
                      <div className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-500 group-hover:text-emerald-600 group-hover:border-emerald-100 transition-colors">
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-slate-800">{item.user_name}</p>
                        <p className="text-[13px] font-medium text-slate-500 truncate mt-0.5 leading-snug pr-4">{item.action}</p>
                      </div>
                      <span suppressHydrationWarning className="hidden sm:block text-[11px] font-semibold text-slate-400 whitespace-nowrap">{new Date(item.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {/* Mobile date display */}
                    <span suppressHydrationWarning className="sm:hidden text-[11px] font-semibold text-slate-400 pl-13">{new Date(item.created_at).toLocaleString()}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Notifications</h3>
                <p className="text-[13px] font-medium text-slate-500 mt-0.5">Most recent alerts.</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Bell className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {data.notifications.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3 text-slate-300">
                  <Bell size={20} />
                </div>
                <h3 className="text-[14px] font-bold text-slate-800">No notifications yet</h3>
                <p className="text-[13px] text-slate-400 mt-0.5">You're all caught up.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.notifications.slice(0, 3).map((item) => (
                  <div key={item.id} className="relative rounded-2xl border border-slate-100 bg-slate-50/50 p-4 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group overflow-hidden">
                    {!item.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />}
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <p className={`text-[13px] ${!item.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'} leading-tight`}>{item.title}</p>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">{item.time}</span>
                    </div>
                    <p className="text-[12px] font-medium text-slate-500 leading-relaxed mt-1.5">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Upcoming Events</h3>
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="space-y-4">
              {upcomingEvents.map((event, index) => {
                const colors =
                  event.type === "deadline"
                    ? { bg: "bg-rose-100", border: "border-rose-200", text: "text-rose-600" }
                    : event.type === "event"
                    ? { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-600" }
                    : event.type === "meeting"
                    ? { bg: "bg-sky-100", border: "border-sky-200", text: "text-sky-600" }
                    : { bg: "bg-emerald-100", border: "border-emerald-200", text: "text-emerald-600" };
                return (
                  <div key={index} className="flex items-start gap-3.5 group">
                    <div className={`mt-0.5 shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border shadow-sm transition-transform group-hover:scale-105 ${colors.bg} ${colors.border}`}>
                      <Calendar className={`w-4 h-4 ${colors.text}`} strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-slate-800 leading-tight group-hover:text-emerald-600 transition-colors">{event.title}</p>
                      <p className="text-[12px] font-semibold text-slate-400 mt-1 uppercase tracking-wide">{event.date}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
