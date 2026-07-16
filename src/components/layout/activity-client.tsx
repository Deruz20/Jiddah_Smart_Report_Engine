"use client";

import React, { useMemo, useState } from "react";
import { Activity, Bell, BookOpen, ChevronDown, FileText, Search, Settings, Users, UserPlus } from "lucide-react";
import { HeroSection } from "@/components/HeroSection";

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

const entityIcon = (type: string) => {
  switch (type) {
    case "report":
      return <FileText className="w-4 h-4 text-emerald-500" />;
    case "marks":
      return <BookOpen className="w-4 h-4 text-indigo-500" />;
    case "student":
      return <Users className="w-4 h-4 text-amber-500" />;
    case "teacher":
      return <UserPlus className="w-4 h-4 text-orange-500" />;
    case "notification":
      return <Bell className="w-4 h-4 text-violet-500" />;
    case "system":
      return <Settings className="w-4 h-4 text-emerald-800" />;
    default:
      return <Activity className="w-4 h-4 text-slate-400" />;
  }
};

const entityBg = (type: string) => {
  switch (type) {
    case "report":
      return "bg-emerald-50";
    case "marks":
      return "bg-indigo-50";
    case "student":
      return "bg-amber-50";
    case "teacher":
      return "bg-orange-50";
    case "notification":
      return "bg-violet-50";
    case "system":
      return "bg-emerald-100";
    default:
      return "bg-slate-100";
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

export default function ActivityClient({ initialActivities }: { initialActivities: any[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const filteredActivities = useMemo(
    () => initialActivities.filter((activity) => {
      const normalizedSearch = search.toLowerCase().trim()
      const matchesSearch =
        activity.user_name.toLowerCase().includes(normalizedSearch) ||
        activity.action.toLowerCase().includes(normalizedSearch) ||
        activity.entity_label.toLowerCase().includes(normalizedSearch)
      const matchesType =
        typeFilter === "All" || activity.entity_type === typeFilter
      return matchesSearch && matchesType
    }),
    [initialActivities, search, typeFilter]
  )

  const getActionText = (activity: typeof initialActivities[number]) => {
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
    <div className="w-full pb-12">
      <HeroSection
        title="Activity Logs"
        subtitle="Complete audit trail of all system and user activity"
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search activity..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none border border-slate-200 bg-white text-sm"
            />
          </div>
          <div className="relative max-w-xs">
            <select
              aria-label="Filter activity by entity type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 appearance-none cursor-pointer"
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-500" />
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{filteredActivities.length} entries</p>
          </div>

          <div className="divide-y divide-slate-50">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 font-medium">No activity found.</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${entityBg(activity.entity_type)}`}>
                    {entityIcon(activity.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">
                      {getActionText(activity)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-slate-500">{activity.entity_label}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{formatRelativeTime(activity.created_at)}</span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                      {activity.entity_type}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {activity.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
