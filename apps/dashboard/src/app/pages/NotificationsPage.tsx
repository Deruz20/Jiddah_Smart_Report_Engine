import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2, AlertCircle, FileText, Users, Upload, Settings, Activity } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useActivity } from "@/hooks/useActivity";
import { HeroSection } from "@/components/HeroSection";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { formatRelativeTime } from "@/lib/timeUtils";
import { toast } from "sonner";

const notifIcon = (type: string) => {
  switch (type) {
    case "deadline":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    case "report":
      return <FileText className="w-5 h-5" style={{ color: "#10B981" }} />;
    case "student":
      return <Users className="w-5 h-5" style={{ color: "#6366F1" }} />;
    case "upload":
      return <Upload className="w-5 h-5" style={{ color: "#F59E0B" }} />;
    case "system":
      return <Settings className="w-5 h-5" style={{ color: "#6B7280" }} />;
    default:
      return <Bell className="w-5 h-5" style={{ color: "#10B981" }} />;
  }
};

const notifBg = (type: string) => {
  switch (type) {
    case "deadline":
      return "rgba(239,68,68,0.08)";
    case "report":
      return "rgba(16,185,129,0.08)";
    case "student":
      return "rgba(99,102,241,0.08)";
    case "upload":
      return "rgba(245,158,11,0.08)";
    default:
      return "rgba(107,114,128,0.08)";
  }
};

const priorityBadge = (priority: string) => {
  switch (priority) {
    case "high":
      return { label: "High", color: "#EF4444", bg: "rgba(239,68,68,0.1)" };
    case "medium":
      return { label: "Medium", color: "#F59E0B", bg: "rgba(245,158,11,0.1)" };
    default:
      return { label: "Normal", color: "#10B981", bg: "rgba(16,185,129,0.1)" };
  }
};

export default function NotificationsPage() {
  const {
    notifications: apiNotifs,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    markAsRead,
  } = useNotifications();
  const { activities, loading: activityLoading, error: activityError } = useActivity();
  const [notifs, setNotifs] = useState(apiNotifs);

  useEffect(() => {
    setNotifs(apiNotifs);
  }, [apiNotifs]);

  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"notifications" | "activity">("notifications");

  const filtered = notifs.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "high") return n.priority === "high";
    return true;
  });

  const localUnreadCount = notifs.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const markRead = (id: number) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    void markAsRead(id);
  };

  const deleteNotif = (id: number) => {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    toast.info("Notification removed");
  };

  const filterEmptyMessage = () => {
    if (filter === "unread") return "No unread notifications";
    if (filter === "high") return "No high-priority notifications";
    return "No notifications yet";
  };

  return (
    <div>
      <HeroSection
        title="Notifications & Activity"
        subtitle="Stay updated with school activity and system alerts"
        actions={
          unreadCount > 0 ? (
            <div className="rounded-full px-3 py-2 text-sm font-semibold" style={{ background: "rgba(220,252,231,1)", color: "#166534" }}>
              {unreadCount} unread
            </div>
          ) : null
        }
      />

      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "#F3F4F6" }}>
        {[
          { key: "notifications" as const, label: "Notifications", count: localUnreadCount },
          { key: "activity" as const, label: "Activity Log", count: null },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-2 px-5 py-2 rounded-lg transition-all"
            style={{
              background: tab === key ? "white" : "transparent",
              color: tab === key ? "#374151" : "#6B7280",
              fontSize: "13px",
              fontWeight: tab === key ? 600 : 400,
              boxShadow: tab === key ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-white" style={{ background: "#EF4444", fontSize: "11px", fontWeight: 700 }}>
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
                className="px-4 py-2 rounded-xl transition-all"
                style={{
                  background: filter === key ? "#065F46" : "white",
                  color: filter === key ? "white" : "#6B7280",
                  border: filter === key ? "none" : "1px solid #E5E7EB",
                  fontSize: "13px",
                  fontWeight: filter === key ? 600 : 400,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {notificationsLoading ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
              <SkeletonLoader rows={3} />
            </div>
          ) : notificationsError ? (
            <div className="rounded-2xl bg-white border border-red-100 p-6 text-center text-sm text-red-600 shadow-sm">
              {notificationsError}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <div className="text-center py-16 rounded-2xl bg-white border border-slate-200">
                  <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: "#E5E7EB" }} />
                  <p style={{ fontSize: "15px", color: "#9CA3AF" }}>{filterEmptyMessage()}</p>
                </div>
              ) : (
                filtered.map((notif) => {
                  const badge = priorityBadge(notif.priority)
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-4 p-5 rounded-2xl transition-all cursor-pointer"
                      style={{
                        background: notif.read ? "white" : "rgba(16,185,129,0.03)",
                        border: `1px solid ${notif.read ? "rgba(0,0,0,0.07)" : "rgba(16,185,129,0.15)"}`,
                        boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                      }}
                      onClick={() => markRead(notif.id)}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: notifBg(notif.type) }}>
                        {notifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {!notif.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                              <p style={{ fontSize: "14px", fontWeight: notif.read ? 500 : 700, color: "#374151" }}>{notif.title}</p>
                              <span className="px-2 py-0.5 rounded-full" style={{ background: badge.bg, color: badge.color, fontSize: "11px", fontWeight: 600 }}>
                                {badge.label}
                              </span>
                            </div>
                            <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5 }}>{notif.message}</p>
                            <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "6px" }}>{formatRelativeTime(notif.time)}</p>
                          </div>
                          <button
                            aria-label="Delete notification"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotif(notif.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#374151" }}>Recent Activity</h3>
            <p style={{ fontSize: "12px", color: "#9CA3AF" }}>All system and user activity logs</p>
          </div>
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
            {activityLoading ? (
              <div className="p-6">
                <SkeletonLoader rows={3} />
              </div>
            ) : activityError ? (
              <div className="p-6 text-center text-sm text-red-600">{activityError}</div>
            ) : activities.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">No activity recorded yet</div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(16,185,129,0.08)" }}>
                    <Activity className="w-4 h-4" style={{ color: "#10B981" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{activity.user_name}</p>
                    <p style={{ fontSize: "12.5px", color: "#6B7280" }}>{activity.action}</p>
                  </div>
                  <span style={{ fontSize: "11px", color: "#9CA3AF", flexShrink: 0 }}>{formatRelativeTime(activity.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
