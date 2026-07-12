"use client";

import React, { useState } from "react";
import { Bell, Trash2, AlertCircle, FileText, Users, Upload, Settings, Activity } from "lucide-react";
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

const notifIcon = (type: string) => {
  switch (type) {
    case "deadline":
      return <AlertCircle className="w-5 h-5 text-rose-500" />;
    case "report":
      return <FileText className="w-5 h-5 text-emerald-500" />;
    case "student":
      return <Users className="w-5 h-5 text-indigo-500" />;
    case "upload":
      return <Upload className="w-5 h-5 text-amber-500" />;
    case "system":
      return <Settings className="w-5 h-5 text-slate-500" />;
    default:
      return <Bell className="w-5 h-5 text-emerald-500" />;
  }
};

const notifBg = (type: string) => {
  switch (type) {
    case "deadline":
      return "bg-rose-50";
    case "report":
      return "bg-emerald-50";
    case "student":
      return "bg-indigo-50";
    case "upload":
      return "bg-amber-50";
    default:
      return "bg-slate-100";
  }
};

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return { label: "High", color: "text-rose-700", bg: "bg-rose-100" };
    case "medium":
      return { label: "Medium", color: "text-amber-700", bg: "bg-amber-100" };
    default:
      return { label: "Normal", color: "text-emerald-700", bg: "bg-emerald-100" };
  }
};

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: string;
  type: string;
}

export default function NotificationsClient({ initialNotifications, initialActivities }: { initialNotifications: Notification[], initialActivities: any[] }) {
  const [notifs, setNotifs] = useState(initialNotifications);
  const [activities] = useState(initialActivities);

  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"notifications" | "activity">("notifications");

  const filtered = notifs.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "high") return n.priority === "high";
    return true;
  });

  const localUnreadCount = notifs.filter((n) => !n.read).length;

  const markRead = async (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await fetch(`/api/notifications/${id}/mark-read`, { method: "POST" });
    } catch (e) {
      // ignore
    }
  };

  const deleteNotif = (id: number) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    // Could also call a DELETE API endpoint here
  };

  const filterEmptyMessage = () => {
    if (filter === "unread") return "No unread notifications";
    if (filter === "high") return "No high-priority notifications";
    return "No notifications yet";
  };

  return (
    <div className="w-full pb-12">
      <HeroSection
        title="Notifications & Activity"
        subtitle="Stay updated with school activity and system alerts"
        actions={
          localUnreadCount > 0 ? (
            <div className="rounded-full px-3 py-1.5 text-sm font-semibold bg-emerald-100 text-emerald-800">
              {localUnreadCount} unread
            </div>
          ) : null
        }
      />

      <div className="px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit bg-slate-100">
          {[
            { key: "notifications" as const, label: "Notifications", count: localUnreadCount },
            { key: "activity" as const, label: "Activity Log", count: null },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg transition-all text-sm ${
                tab === key 
                  ? "bg-white text-slate-800 font-semibold shadow-sm" 
                  : "bg-transparent text-slate-500 font-medium hover:text-slate-700"
              }`}
            >
              {label}
              {count !== null && count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-white bg-rose-500 text-[10px] font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "notifications" && (
          <div>
            <div className="flex gap-2 mb-5">
              {[
                { key: "all", label: "All" },
                { key: "unread", label: `Unread (${localUnreadCount})` },
                { key: "high", label: "High Priority" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-xl transition-all text-sm font-semibold ${
                    filter === key 
                      ? "bg-emerald-800 text-white shadow-md shadow-emerald-900/20" 
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="text-sm text-slate-400 font-medium">{filterEmptyMessage()}</p>
                </div>
              ) : (
                filtered.map((notif) => {
                  const badge = priorityBadge(notif.priority)
                  return (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-4 p-5 rounded-2xl transition-all cursor-pointer shadow-sm ${
                        notif.read ? "bg-white border border-slate-200 hover:bg-slate-50" : "bg-emerald-50/50 border border-emerald-200 hover:bg-emerald-50"
                      }`}
                      onClick={() => markRead(notif.id)}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${notifBg(notif.type)}`}>
                        {notifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {!notif.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                              <p className={`text-sm text-slate-800 ${notif.read ? 'font-medium' : 'font-bold'}`}>{notif.title}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 leading-relaxed">{notif.message}</p>
                            <p className="text-xs text-slate-400 mt-2 font-medium">{formatRelativeTime(notif.time)}</p>
                          </div>
                          <button
                            aria-label="Delete notification"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotif(notif.id)
                            }}
                            className="p-2 rounded-lg hover:bg-rose-50 flex-shrink-0 text-slate-400 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {tab === "activity" && (
          <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
              <p className="text-xs text-slate-500 mt-1">All system and user activity logs</p>
            </div>
            <div className="divide-y divide-slate-50">
              {activities.length === 0 ? (
                <div className="p-10 text-center text-sm font-medium text-slate-400">No activity recorded yet</div>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50">
                      <Activity className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-700">{activity.user_name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{activity.action}</p>
                    </div>
                    <span className="text-xs font-medium text-slate-400 flex-shrink-0 mt-1">{formatRelativeTime(activity.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
