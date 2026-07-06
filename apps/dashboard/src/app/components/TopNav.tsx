import { useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Search, ChevronDown, Sun, Moon, Zap, Settings, LogOut, User, Shield } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { useTerms } from "@/hooks/useTerms";
import { useAuthContext } from "@/contexts/AuthProvider";

interface TopNavProps {
  sidebarCollapsed: boolean;
}

export function TopNav({ sidebarCollapsed }: TopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const { terms, currentTerm } = useTerms();
  const [selectedTermId, setSelectedTermId] = useState(currentTerm?.id ?? "");

  const recentNotifs = notifications.slice(0, 5);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center gap-4 px-4 sm:px-6 py-3 border-b bg-white transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
      style={{
        left: typeof window !== "undefined" && window.innerWidth >= 1024 ? (sidebarCollapsed ? "80px" : "280px") : "0px",
        height: "72px",
        borderColor: "rgba(0,0,0,0.07)",
      }}
    >
      <div className="flex-1 max-w-md relative">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-text"
          style={{ background: "#F3F4F6", border: "1px solid rgba(0,0,0,0.07)" }}
        >
          <Search className="w-4 h-4" style={{ color: "#9CA3AF" }} />
          <span style={{ fontSize: "13.5px", color: "#9CA3AF" }}>Search students, reports, teachers…</span>
        </div>
      </div>

      <div className="relative">
        <select
          value={selectedTermId || currentTerm?.id || ""}
          onChange={(e) => setSelectedTermId(e.target.value)}
          className="pl-3 pr-8 py-2 rounded-xl border appearance-none cursor-pointer"
          style={{
            background: "white",
            border: "1px solid rgba(0,0,0,0.1)",
            fontSize: "13px",
            color: "#374151",
            fontWeight: 500,
          }}
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "#6B7280" }} />
      </div>

      <button
        onClick={() => navigate("/reports")}
        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all hover:opacity-90"
        style={{ background: "#10B981", color: "white", fontSize: "13px", fontWeight: 500 }}
      >
        <Zap className="w-3.5 h-3.5" />
        Generate Report
      </button>

      <button
        onClick={() => setDarkMode(!darkMode)}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100"
        style={{ border: "1px solid rgba(0,0,0,0.07)" }}
      >
        {darkMode ? <Moon className="w-4 h-4" style={{ color: "#374151" }} /> : <Sun className="w-4 h-4" style={{ color: "#374151" }} />}
      </button>

      <div className="relative">
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-gray-100 relative"
          style={{ border: "1px solid rgba(0,0,0,0.07)" }}
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
        >
          <Bell className="w-4 h-4" style={{ color: "#374151" }} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{ background: "#EF4444", fontSize: "10px" }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 rounded-2xl shadow-xl z-50 overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
              <p className="font-semibold" style={{ fontSize: "14px", color: "#374151" }}>Notifications</p>
              <button type="button" className="text-xs" style={{ color: "#10B981" }} onClick={() => navigate("/notifications")}>View all</button>
            </div>
            {recentNotifs.length === 0 ? (
              <p className="px-4 py-6 text-center" style={{ fontSize: "13px", color: "#9CA3AF" }}>No notifications</p>
            ) : (
              recentNotifs.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="w-full flex gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b"
                  style={{ borderColor: "rgba(0,0,0,0.04)", background: n.read ? "" : "rgba(16,185,129,0.03)" }}
                  onClick={() => { if (!n.read) void markAsRead(n.id); }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: n.read ? "#D1D5DB" : "#10B981" }} />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: n.read ? 400 : 600, color: "#374151" }}>{n.title}</p>
                    <p style={{ fontSize: "12px", color: "#6B7280" }}>{n.message}</p>
                    <p style={{ fontSize: "11px", color: "#9CA3AF", marginTop: "2px" }}>{n.time}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-all"
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #065F46)" }}>
            <span className="text-white text-xs font-bold">{(user?.name ?? "A").slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="text-left hidden sm:block">
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#374151" }}>{user?.name ?? "Admin"}</p>
            <p style={{ fontSize: "11px", color: "#9CA3AF" }}>{user?.role ?? "Staff"}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#9CA3AF" }} />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-12 w-52 rounded-2xl shadow-xl z-50 overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
            {[
              { icon: User, label: "My Profile", path: "/account" },
              { icon: Settings, label: "Settings", path: "/settings" },
              { icon: Shield, label: "Security", path: "/account" },
            ].map(({ icon: Icon, label, path }) => (
              <button
                key={label}
                type="button"
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                onClick={() => { navigate(path); setProfileOpen(false); }}
              >
                <Icon className="w-4 h-4" style={{ color: "#6B7280" }} />
                <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
              </button>
            ))}
            <div className="border-t mx-3" style={{ borderColor: "rgba(0,0,0,0.06)" }} />
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left"
              onClick={() => { void logout(); navigate("/login"); }}
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span style={{ fontSize: "13px", color: "#EF4444" }}>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
