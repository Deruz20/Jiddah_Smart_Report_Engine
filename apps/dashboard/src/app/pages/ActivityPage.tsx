import { useEffect, useMemo, useState } from "react";
import { Activity, Bell, BookOpen, ChevronDown, FileText, Search, Settings, Users, UserPlus } from "lucide-react";
import { useActivity } from "@/hooks/useActivity";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { HeroSection } from "@/components/HeroSection";
import { formatRelativeTime } from "@/lib/timeUtils";

const entityIcon = (type: string) => {
  switch (type) {
    case "report":
      return <FileText className="w-4 h-4" style={{ color: "#10B981" }} />;
    case "marks":
      return <BookOpen className="w-4 h-4" style={{ color: "#6366F1" }} />;
    case "student":
      return <Users className="w-4 h-4" style={{ color: "#F59E0B" }} />;
    case "teacher":
      return <UserPlus className="w-4 h-4" style={{ color: "#F97316" }} />;
    case "notification":
      return <Bell className="w-4 h-4" style={{ color: "#8B5CF6" }} />;
    case "system":
      return <Settings className="w-4 h-4" style={{ color: "#065F46" }} />;
    default:
      return <Activity className="w-4 h-4" style={{ color: "#9CA3AF" }} />;
  }
};

const entityBg = (type: string) => {
  switch (type) {
    case "report":
      return "rgba(16,185,129,0.12)";
    case "marks":
      return "rgba(99,102,241,0.12)";
    case "student":
      return "rgba(245,158,11,0.12)";
    case "teacher":
      return "rgba(249,115,22,0.12)";
    case "notification":
      return "rgba(139,92,246,0.12)";
    case "system":
      return "rgba(6,95,70,0.12)";
    default:
      return "rgba(107,114,128,0.12)";
  }
};

const entityColor = (type: string) => {
  switch (type) {
    case "report":
      return "#065F46";
    case "marks":
      return "#3730A3";
    case "student":
      return "#92400E";
    case "teacher":
      return "#B45309";
    case "notification":
      return "#6D28D9";
    case "system":
      return "#065F46";
    default:
      return "#374151";
  }
};

const filterOptions = [
  { label: "All", value: "All" },
  { label: "Student", value: "student" },
  { label: "Marks", value: "marks" },
  { label: "Teacher", value: "teacher" },
  { label: "Report", value: "report" },
  { label: "Notification", value: "notification" },
  { label: "System", value: "system" },
];

export default function ActivityPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const { activities, loading, error, refetch } = useActivity();

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refetch()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [refetch]);

  const filteredActivities = useMemo(
    () => activities.filter((activity) => {
      const normalizedSearch = search.toLowerCase().trim()
      const matchesSearch =
        activity.user_name.toLowerCase().includes(normalizedSearch) ||
        activity.action.toLowerCase().includes(normalizedSearch) ||
        activity.entity_label.toLowerCase().includes(normalizedSearch)
      const matchesType =
        typeFilter === "All" || activity.entity_type === typeFilter
      return matchesSearch && matchesType
    }),
    [activities, search, typeFilter]
  )

  const getActionText = (activity: typeof activities[number]) => {
    if (!activity) return ''
    const userName = activity.user_name || 'System'
    const actionLower = activity.action.toLowerCase()
    const userLower = userName.toLowerCase()
    if (actionLower.startsWith(userLower)) {
      return activity.action
    }
    return `${userName} ${activity.action}`
  }

  return (
    <div>
      <HeroSection
        title="Activity Logs"
        subtitle="Complete audit trail of all system and user activity"
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#9CA3AF" }} />
          <input
            placeholder="Search activity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none"
            style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px" }}
          />
        </div>
        <div className="relative max-w-xs">
          <select
            aria-label="Filter activity by entity type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 rounded-xl border appearance-none cursor-pointer"
            style={{ border: "1px solid #E5E7EB", background: "white", fontSize: "13.5px", color: "#374151" }}
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b bg-slate-50" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <p style={{ fontSize: "13px", color: "#9CA3AF" }}>{filteredActivities.length} entries</p>
        </div>
        <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
          {loading ? (
            <div className="p-6">
              <SkeletonLoader rows={3} />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-red-500">{error}</div>
          ) : filteredActivities.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">No activity recorded yet</div>
          ) : (
            filteredActivities.map((activity) => (
              <div key={activity.id} className="flex flex-col gap-3 px-6 py-5 hover:bg-slate-50 transition-colors md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: entityBg(activity.entity_type) }}>
                    {entityIcon(activity.entity_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate" style={{ fontSize: '13.5px' }}>
                      {getActionText(activity)}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 truncate" style={{ fontSize: '13px' }}>
                      {activity.entity_label}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{formatRelativeTime(activity.created_at)}</p>
                  <span className="inline-flex mt-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase" style={{ background: entityBg(activity.entity_type), color: entityColor(activity.entity_type) }}>
                    {activity.entity_type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
