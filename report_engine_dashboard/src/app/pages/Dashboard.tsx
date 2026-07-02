import { useMemo } from "react";
import { useNavigate } from "react-router";
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
  Download,
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
import { motion } from "motion/react";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useActivity } from "@/hooks/useActivity";
import { useNotifications } from "@/hooks/useNotifications";

const upcomingEvents = [
  { title: "Term 3 Marks Deadline", date: "May 16, 2025", type: "deadline" },
  { title: "Primary 6 Graduation Ceremony", date: "May 28, 2025", type: "event" },
  { title: "Parent-Teacher Conference", date: "June 4, 2025", type: "meeting" },
  { title: "Academic Session Ends", date: "June 20, 2025", type: "term" },
];

const activityIcons: Record<string, typeof User> = {
  student: User,
  marks: Pencil,
  teacher: UserCheck,
  report: FileText,
  notification: Bell,
  system: AlertCircle,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { analytics, loading: analyticsLoading, error: analyticsError, refetch: analyticsRefetch } = useAnalytics();
  const { activities, loading: activityLoading, error: activityError, refetch: activityRefetch } = useActivity();
  const { notifications, loading: notificationsLoading, error: notificationsError, refetch: notificationsRefetch } = useNotifications();

  const analyticsData = analytics ?? {
    kpis: {
      totalStudents: 0,
      activeClasses: 0,
      reportsGenerated: 0,
      avgAttendance: 0,
      teachers: 0,
      pendingMarks: 0,
    },
    termPerformance: [],
    classPerformance: [],
    subjectPerformance: [],
    attendanceTrend: [],
    currentTerm: null,
  };

  const kpiCards = useMemo(() => {
    const k = analyticsData.kpis;
    return [
      {
        label: "Total Students",
        value: String(k.totalStudents),
        change: "Active enrollments",
        icon: Users,
        textClass: "text-emerald-600",
        bgClass: "bg-emerald-100",
      },
      {
        label: "Active Teachers",
        value: String(k.teachers),
        change: "Currently active",
        icon: BookOpen,
        textClass: "text-emerald-900",
        bgClass: "bg-emerald-100",
      },
      {
        label: "Reports Generated",
        value: String(k.reportsGenerated),
        change: "Logged this term",
        icon: FileText,
        textClass: "text-indigo-600",
        bgClass: "bg-indigo-100",
      },
      {
        label: "Avg Attendance",
        value: `${k.avgAttendance}%`,
        change: "School average",
        icon: TrendingUp,
        textClass: "text-pink-600",
        bgClass: "bg-pink-100",
      },
    ];
  }, [analyticsData]);

  const subtitle = analyticsData.currentTerm?.label
    ? analyticsData.currentTerm.label
    : "Analytics, activity, and action cards for your school.";

  const attendanceAverage = analyticsData.attendanceTrend.length
    ? Math.round(
        analyticsData.attendanceTrend.reduce((sum, item) => sum + Number(item.rate), 0) /
          analyticsData.attendanceTrend.length
      )
    : 0;

  return (
    <div>
      <HeroSection
        title="Admin Dashboard"
        subtitle={subtitle}
        actions={
          <>
            <button
              onClick={() => navigate("/reports")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10B981] text-sm font-semibold text-white"
            >
              <Printer className="w-4 h-4" /> Generate Reports
            </button>
            <button
              onClick={() => navigate("/analytics")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              <BarChart3 className="w-4 h-4" /> View Analytics
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {analyticsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-3xl bg-slate-100 p-5 animate-pulse" />
          ))
        ) : analyticsError ? (
          <div className="lg:col-span-4 rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
            Could not load KPI data.
            <button onClick={() => analyticsRefetch()} className="ml-4 font-semibold text-emerald-700">
              Retry
            </button>
          </div>
        ) : (
          kpiCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ${card.bgClass}`}>
                    <Icon className={`h-5 w-5 ${card.textClass}`} />
                  </div>
                  <span className={`text-xs font-semibold ${card.textClass}`}>
                    {card.change}
                  </span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900">{card.value}</h2>
                <p className="mt-2 text-sm text-slate-500">{card.label}</p>
              </motion.div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Attendance Trend</h3>
              <p className="text-xs text-slate-500">Monthly attendance data for the year.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              Avg {attendanceAverage}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={analyticsData.attendanceTrend}>
              <defs>
                <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis domain={[80, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="rate" stroke="#10B981" strokeWidth={2.5} fill="url(#attendanceGrad)" dot={{ r: 3, fill: "#10B981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-slate-900">Class Performance</h3>
            <p className="text-xs text-slate-500">Average score by class.</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analyticsData.classPerformance} layout="vertical" barSize={10}>
              <XAxis type="number" domain={[60, 100]} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="class" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="avg" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
              <p className="text-xs text-slate-500">Latest administrative actions.</p>
            </div>
            <button onClick={() => navigate("/activity")} className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activityLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 rounded-3xl bg-slate-100 animate-pulse" />
              ))}
            </div>
          ) : activityError ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
              Could not load recent activity.
              <button onClick={() => activityRefetch()} className="ml-4 font-semibold text-emerald-700">Retry</button>
            </div>
          ) : activities.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No activity recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {activities.map((item) => {
                const Icon = activityIcons[item.entity_type] || AlertCircle;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-start gap-3 rounded-3xl border border-slate-200 p-4"
                  >
                    <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{item.user_name}</p>
                      <p className="mt-1 text-sm text-slate-600 truncate">{item.action}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                <p className="text-xs text-slate-500">Most recent alerts.</p>
              </div>
              <Bell className="w-4 h-4 text-slate-400" />
            </div>

            {notificationsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-16 rounded-3xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : notificationsError ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-700">
                Could not load notifications.
                <button onClick={() => notificationsRefetch()} className="ml-4 font-semibold text-emerald-700">Retry</button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No notifications yet.</div>
            ) : (
              <div className="space-y-4">
                {notifications.slice(0, 3).map((item) => (
                  <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <span className="text-xs text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Upcoming Events</h3>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => {
                const dotClass =
                  event.type === "deadline"
                    ? "bg-red-500"
                    : event.type === "event"
                    ? "bg-amber-500"
                    : event.type === "meeting"
                    ? "bg-sky-600"
                    : "bg-emerald-500"
                return (
                  <div key={index} className="flex items-start gap-3">
                    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{event.title}</p>
                      <p className="text-xs text-slate-500">{event.date}</p>
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
