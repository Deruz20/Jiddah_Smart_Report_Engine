"use client";

import React, { useEffect, useState } from "react";
import { Bell, Trash2, AlertCircle, FileText, Users, Upload, Settings, Activity, CheckCheck } from "lucide-react";
import { toast } from "sonner";

function formatRelativeTime(dateString: string) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
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
      return <AlertCircle className="w-5 h-5 text-rose-600" />;
    case "report":
      return <FileText className="w-5 h-5 text-emerald-700" />;
    case "student":
      return <Users className="w-5 h-5 text-amber-700" />;
    case "upload":
      return <Upload className="w-5 h-5 text-amber-600" />;
    case "system":
      return <Settings className="w-5 h-5 text-stone-600" />;
    default:
      return <Bell className="w-5 h-5 text-emerald-700" />;
  }
};

const notifBg = (type: string) => {
  switch (type) {
    case "deadline":
      return "bg-rose-50 border border-rose-100";
    case "report":
      return "bg-emerald-50 border border-emerald-100";
    case "student":
      return "bg-amber-50 border border-amber-100";
    case "upload":
      return "bg-amber-50 border border-amber-100";
    default:
      return "bg-stone-100 border border-stone-200";
  }
};

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return { label: "High", color: "text-rose-800", bg: "bg-rose-100" };
    case "medium":
      return { label: "Medium", color: "text-amber-800", bg: "bg-amber-100" };
    default:
      return { label: "Normal", color: "text-emerald-800", bg: "bg-emerald-100" };
  }
};

export interface NotificationItem {
  id: number | string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: string;
  type: string;
}

export default function NotificationsClient({
  initialNotifications,
  initialActivities,
}: {
  initialNotifications: NotificationItem[];
  initialActivities: any[];
}) {
  const [notifs, setNotifs] = useState<NotificationItem[]>(initialNotifications);
  const [activities, setActivities] = useState<any[]>(initialActivities);
  const [markingAll, setMarkingAll] = useState(false);

  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"notifications" | "activity">("notifications");

  // Fetch latest notifications once on mount if initialNotifications is empty (supports client-side / mocked API verification)
  useEffect(() => {
    if (initialNotifications.length > 0) return;
    let active = true;
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!active || !payload?.data) return;
        if (Array.isArray(payload.data) && payload.data.length > 0) {
          setNotifs(
            payload.data.map((n: any) => ({
              id: n.id,
              title: n.title || "",
              message: n.message || "",
              time: n.time || n.created_at || "",
              read: Boolean(n.read),
              priority: n.priority || "normal",
              type: n.type || "info",
            }))
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [initialNotifications.length]);

  const filtered = notifs.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "high") return n.priority === "high";
    return true;
  });

  const localUnreadCount = notifs.filter((n) => !n.read).length;

  const markRead = async (id: number | string) => {
    const target = notifs.find((n) => n.id === id);
    if (target?.read) return;

    const prevNotifs = notifs;
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const res = await fetch(`/api/notifications/${id}/mark-read`, { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to update notification");
      }
      window.dispatchEvent(new CustomEvent("notifications-updated"));
      toast.success("Notification marked as read");
    } catch (e: any) {
      setNotifs(prevNotifs);
      toast.error(e.message || "Failed to update notification");
    }
  };

  const markAllRead = async () => {
    if (localUnreadCount === 0 || markingAll) return;
    const prevNotifs = notifs;
    setMarkingAll(true);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to mark all notifications as read");
      }
      window.dispatchEvent(new CustomEvent("notifications-updated"));
      toast.success("All notifications marked as read");
    } catch (e: any) {
      setNotifs(prevNotifs);
      toast.error(e.message || "Failed to mark all notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotif = (id: number | string) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new CustomEvent("notifications-updated"));
  };

  const filterEmptyMessage = () => {
    if (filter === "unread") return "All caught up — no unread notifications.";
    if (filter === "high") return "No high-priority alerts active.";
    return "No notifications recorded yet.";
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-14 space-y-6">
      {/* Compact Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-stone-900">Notifications & Activity Log</h1>
            <span
              data-testid="unread-count-badge"
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                localUnreadCount > 0
                  ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                  : "bg-stone-100 text-stone-600"
              }`}
            >
              {localUnreadCount} unread
            </span>
          </div>
          <p className="text-xs text-stone-600 mt-1">
            System alerts, batch report dispatches, and audit trail from activity logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={localUnreadCount === 0 || markingAll}
            data-testid="mark-all-read-btn"
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 bg-[#0F4D25] text-white hover:bg-emerald-900 disabled:opacity-40 transition cursor-pointer shadow-sm"
          >
            <CheckCheck className="w-4 h-4" />
            <span>{markingAll ? "Marking..." : "Mark All as Read"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-xl bg-stone-200/70 border border-stone-200">
          {[
            { key: "notifications" as const, label: "Notifications", count: localUnreadCount },
            { key: "activity" as const, label: "Activity Log", count: activities.length },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`min-h-[44px] flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-xs cursor-pointer ${
                tab === key
                  ? "bg-white text-stone-900 font-bold shadow-sm"
                  : "bg-transparent text-stone-600 font-semibold hover:text-stone-900"
              }`}
            >
              <span>{label}</span>
              {count !== null && count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                    key === "notifications"
                      ? "text-white bg-rose-600"
                      : "text-stone-700 bg-stone-100"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "notifications" && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "All" },
              { key: "unread", label: `Unread (${localUnreadCount})` },
              { key: "high", label: "High Priority" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`min-h-[44px] px-4 py-2 rounded-xl transition-all text-xs font-bold tabular-nums cursor-pointer ${
                  filter === key
                    ? "bg-[#0F4D25] text-white shadow-sm"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "notifications" && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-14 rounded-2xl bg-white border border-stone-200 shadow-sm px-4">
              <Bell className="w-10 h-10 mx-auto mb-2.5 text-stone-300" />
              <p className="text-sm text-stone-700 font-semibold">{filterEmptyMessage()}</p>
              <p className="text-xs text-stone-500 mt-1">
                New mark submissions and report batch events will appear here automatically.
              </p>
            </div>
          ) : (
            filtered.map((notif) => {
              const badge = priorityBadge(notif.priority);
              return (
                <div
                  key={notif.id}
                  data-testid={`notification-item-${notif.id}`}
                  className={`flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl transition-all cursor-pointer shadow-sm ${
                    notif.read
                      ? "bg-white border border-stone-200 hover:bg-stone-50/70"
                      : "bg-[#FAF7F2] border border-emerald-300 hover:bg-emerald-50/40"
                  }`}
                  onClick={() => markRead(notif.id)}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${notifBg(
                      notif.type
                    )}`}
                  >
                    {notifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {!notif.read && (
                            <span
                              data-testid="unread-dot"
                              className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0"
                            />
                          )}
                          <p
                            className={`text-sm text-stone-900 ${
                              notif.read ? "font-semibold" : "font-bold"
                            }`}
                          >
                            {notif.title}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed break-words">
                          {notif.message}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-2 font-medium tabular-nums">
                          {formatRelativeTime(notif.time)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead(notif.id);
                            }}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label="Delete notification"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotif(notif.id);
                          }}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm">
          <div className="px-5 py-4 border-b border-stone-200 bg-[#FAF7F2]">
            <h3 className="text-sm font-bold text-stone-900">Audit & Activity Trail</h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Recorded directly in the <code className="font-mono">activity_logs</code> table.
            </p>
          </div>
          <div className="divide-y divide-stone-100">
            {activities.length === 0 ? (
              <div className="p-10 text-center text-sm font-medium text-stone-500">
                No activity recorded yet.
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-stone-50/70 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 border border-emerald-100">
                    <Activity className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-900">{activity.user_name}</p>
                    <p className="text-xs text-stone-600 mt-0.5 break-words">{activity.action}</p>
                  </div>
                  <span className="text-[11px] font-medium text-stone-500 flex-shrink-0 mt-0.5 tabular-nums">
                    {formatRelativeTime(activity.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
