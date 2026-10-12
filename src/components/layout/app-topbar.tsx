"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import {
  Search,
  Bell,
  CheckCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Home,
  LogOut,
  User,
  Settings,
  Menu,
  X,
  Clock,
  GraduationCap,
  ClipboardEdit,
  FileText,
  Users,
} from "lucide-react";
import { useSidebar } from "../figma-ui/ui/sidebar";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";
import { PowerSyncStatus } from "./PowerSyncStatus";

/* ─── Breadcrumbs (desktop only) ─────────────────────────────────────────── */

function Breadcrumbs({ crumbs }: { crumbs: string[] }) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      <Home className="size-3.5 text-slate-400" strokeWidth={1.8} />
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb}>
          <ChevronRight className="size-3 text-slate-300/40" strokeWidth={2} />
          <span
            className={cn(
              "transition-colors duration-150",
              i === crumbs.length - 1
                ? "text-slate-800 font-medium"
                : "text-slate-400 hover:text-slate-600 cursor-pointer",
            )}
            style={{ fontSize: "0.8rem" }}
          >
            {crumb}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

/* ─── Desktop Search ──────────────────────────────────────────────────────── */

function DesktopSearch() {
  const [focused, setFocused] = React.useState(false);
  const [query, setQuery] = React.useState("");

  return (
    <div
      className={cn(
        "relative hidden md:flex items-center gap-2 h-9 px-3 rounded-xl transition-colors duration-200 border w-72",
        focused
          ? "bg-white border-slate-200 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          : "bg-slate-100/80 border-slate-200/50 hover:bg-slate-100 hover:border-slate-200",
      )}
    >
      <Search
        className={cn("size-3.5 shrink-0 transition-colors duration-200", focused ? "text-emerald-500" : "text-slate-400")}
        strokeWidth={2}
      />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search students, classes..."
        className="flex-1 bg-transparent outline-none text-slate-700 placeholder:text-slate-400 min-w-0"
        style={{ fontSize: "0.8rem" }}
      />
      <AnimatePresence>
        {!focused && (
          <motion.kbd
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-slate-400 bg-slate-200/70 border border-slate-200"
            style={{ fontSize: "0.65rem" }}
          >
            ⌘K
          </motion.kbd>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Mobile Full-Screen Search Overlay ──────────────────────────────────── */

const recentSearches = ["Grade 7A — Fatimah", "Term 1 Mathematics", "Ahmed Al-Rashid"];
const quickActions = [
  { label: "Add Marks", icon: ClipboardEdit, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
  { label: "New Report", icon: FileText, color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.15)" },
  { label: "Students", icon: Users, color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)" },
];

function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    } else {
      setQuery("");
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 md:hidden"
            style={{ background: "rgba(15,23,42,0.25)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-50 md:hidden rounded-b-3xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.99)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.14)",
            }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 pt-14 pb-3">
              <div
                className="flex-1 flex items-center gap-3 h-12 px-4 rounded-2xl"
                style={{ background: "rgba(0,0,0,0.05)", border: "1.5px solid rgba(16,185,129,0.3)" }}
              >
                <Search className="size-4 text-emerald-400 shrink-0" strokeWidth={2} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students, classes, reports..."
                  className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
                  style={{ fontSize: "0.9rem" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="shrink-0 text-slate-400">
                    <X className="size-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 text-emerald-500 font-semibold py-2"
                style={{ fontSize: "0.88rem" }}
              >
                Cancel
              </button>
            </div>

            {/* Content below search */}
            {!query ? (
              <div className="px-4 pb-6">
                <p className="text-slate-400 uppercase tracking-widest mb-2.5" style={{ fontSize: "0.64rem", fontWeight: 600 }}>
                  Recent Searches
                </p>
                <div className="flex flex-col">
                  {recentSearches.map((s) => (
                    <button key={s} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0 active:bg-slate-50 rounded-xl px-1">
                      <div className="flex items-center justify-center size-8 rounded-xl shrink-0" style={{ background: "rgba(0,0,0,0.04)" }}>
                        <Clock className="size-3.5 text-slate-400" strokeWidth={2} />
                      </div>
                      <span className="text-slate-700 flex-1 text-left" style={{ fontSize: "0.88rem" }}>{s}</span>
                      <ChevronRight className="size-3.5 text-slate-300" strokeWidth={2.5} />
                    </button>
                  ))}
                </div>

                <p className="text-slate-400 uppercase tracking-widest mb-3 mt-5" style={{ fontSize: "0.64rem", fontWeight: 600 }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickActions.map(({ label, icon: Icon, color, bg, border }) => (
                    <button
                      key={label}
                      className="flex flex-col items-center gap-2 p-3.5 rounded-2xl active:scale-95 transition-transform duration-100"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <Icon className="size-5" style={{ color }} strokeWidth={1.8} />
                      <span style={{ fontSize: "0.72rem", color, fontWeight: 500, lineHeight: 1.2, textAlign: "center" }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 pb-6">
                <p className="text-slate-400 py-6 text-center" style={{ fontSize: "0.85rem" }}>
                  No results for "{query}"
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Term Badge (desktop only) ──────────────────────────────────────────── */

function TermBadge() {
  const [termName, setTermName] = React.useState<string>("Loading...");

  React.useEffect(() => {
    async function fetchTerm() {
      try {
        const res = await fetch('/api/settings/terms/active');
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setTermName(`${json.data.label}, ${json.data.academic_year}`);
          } else {
            setTermName("No Active Term");
          }
        }
      } catch (err) {
        console.error("Failed to fetch term:", err);
        setTermName("Error fetching term");
      }
    }
    fetchTerm();
  }, []);

  return (
    <div
      className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg"
      style={{
        background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.06) 100%)",
        border: "1px solid rgba(16,185,129,0.2)",
      }}
    >
      <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-emerald-700 font-medium" style={{ fontSize: "0.75rem" }}>
        {termName}
      </span>
    </div>
  );
}

/* ─── Notification Bell ───────────────────────────────────────────────────── */

interface BellNotification {
  id: string | number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: string;
  type: string;
}

function NotificationBell({ size = "default" }: { size?: "default" | "mobile" }) {
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [notifications, setNotifications] = React.useState<BellNotification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Number(data.count) || 0);
      }
    } catch {
      // ignore network errors
    }
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications((json.data ?? []).slice(0, 5));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 45000); // lightweight poll
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  React.useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const handleMarkRead = async (id: string | number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}/mark-read`, { method: "POST" });
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch {
      // ignore
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className={cn(
          "relative flex items-center justify-center rounded-xl text-slate-500 transition-all duration-200 cursor-pointer",
          size === "mobile"
            ? "size-11 hover:bg-slate-100 active:bg-slate-100"
            : "size-9 hover:text-slate-700 hover:bg-slate-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell className={size === "mobile" ? "size-5" : "size-[1.1rem]"} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[0.55rem] h-[0.55rem] rounded-full bg-emerald-600 border-2 border-white shadow-sm flex items-center justify-center" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed right-3 left-3 top-16 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-80 rounded-2xl bg-white border border-slate-200/80 overflow-hidden z-50 shadow-xl"
            style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.12)" }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <span className="text-slate-800 text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400">No recent notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={String(n.id)}
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer",
                      !n.read ? "bg-emerald-50/30" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "mt-1.5 size-2 rounded-full shrink-0",
                        n.priority === "high"
                          ? "bg-rose-500"
                          : n.priority === "medium"
                          ? "bg-amber-500"
                          : !n.read
                          ? "bg-emerald-500"
                          : "bg-slate-300"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs text-slate-800 truncate", !n.read ? "font-semibold" : "font-normal")}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {n.time ? new Date(n.time).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-slate-100 bg-slate-50/50 text-center">
              <Link
                href="/admin/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 block py-1"
              >
                View all notifications &rarr;
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── User Profile Dropdown ───────────────────────────────────────────────── */

function UserProfileDropdown() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [role, setRole] = React.useState<string>("Teacher");
  const [userName, setUserName] = React.useState<string>("User");
  
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user?.user_metadata) {
        setRole(user.user_metadata.role || 'Teacher');
        setUserName(user.user_metadata.full_name || user.email?.split('@')[0] || 'User');
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      const { powerSync } = await import("../providers/PowerSyncProvider");
      await powerSync.disconnectAndClear();
    } catch (e) {
      console.error("Failed to clear PowerSync database:", e);
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2.5 p-2 md:px-3 md:py-2 rounded-xl transition-all duration-200 active:scale-95",
          open ? "bg-slate-100 shadow-sm" : "hover:bg-slate-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className="flex items-center justify-center size-9 rounded-xl text-white font-semibold shrink-0"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            fontSize: "0.8rem",
            boxShadow: "0 2px 6px rgba(16,185,129,0.3)",
          }}
        >
          {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || userName.slice(0,2).toUpperCase()}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-slate-800 font-medium leading-tight" style={{ fontSize: "0.78rem" }}>{userName}</p>
          <p className="text-slate-400 leading-tight" style={{ fontSize: "0.68rem" }}>{role}</p>
        </div>
        <ChevronDown
          className={cn("hidden md:block size-3.5 text-slate-400 transition-transform duration-200", open && "rotate-180")}
          strokeWidth={2.5}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200/60 overflow-hidden z-50 origin-top-right"
            style={{ boxShadow: "0 12px 40px rgba(0,0,0,0.15)" }}
          >
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center size-10 rounded-xl text-white font-semibold shrink-0"
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", fontSize: "0.8rem", boxShadow: "0 2px 8px rgba(16,185,129,0.3)" }}
                >{userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || userName.slice(0,2).toUpperCase()}</div>
                <div>
                  <p className="text-slate-800 font-semibold" style={{ fontSize: "0.9rem" }}>{userName}</p>
                  <p className="text-slate-500" style={{ fontSize: "0.8rem" }}>{role}</p>
                </div>
              </div>
            </div>
            <div className="p-1.5">
              {[{ icon: User, label: "My Profile" }, { icon: Settings, label: "Settings" }].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-[0.98] transition-all duration-150" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  <Icon className="size-4 text-slate-400" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
            <div className="p-1.5 border-t border-slate-100 mt-1">
              <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 active:scale-[0.98] transition-all duration-150" style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                <LogOut className="size-4" strokeWidth={1.8} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Topbar ─────────────────────────────────────────────────────────── */

interface AppTopbarProps {
  breadcrumbs?: string[];
  currentPage?: string;
}

export function AppTopbar({ breadcrumbs = ["Admin", "Dashboard"], currentPage = "Dashboard" }: AppTopbarProps) {
  const { toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();
  const isReportsPage = pathname === "/admin/reports" || pathname === "/admin/theology-hub";
  const [isTopbarHidden, setIsTopbarHidden] = React.useState(isReportsPage);

  // Auto-hide topbar when navigating to reports page
  React.useEffect(() => {
    setIsTopbarHidden(pathname === "/admin/reports" || pathname === "/admin/theology-hub");
  }, [pathname]);

  // Listen for global toggle events from other components (like TopToolbar)
  React.useEffect(() => {
    const handleToggle = () => setIsTopbarHidden(prev => !prev);
    window.addEventListener("toggle-topbar", handleToggle);
    return () => window.removeEventListener("toggle-topbar", handleToggle);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isTopbarHidden && (
          <motion.button
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onClick={() => setIsTopbarHidden(false)}
            className="fixed top-0 right-1/2 translate-x-1/2 z-50 bg-white border border-t-0 border-slate-200 rounded-b-xl shadow-md p-1 px-4 text-slate-400 hover:text-emerald-500 hover:bg-slate-50 transition-colors print:hidden"
            title="Show Topbar"
          >
            <ChevronDown className="size-4" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {!isTopbarHidden && (
          <motion.header
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="sticky top-0 z-30 border-b print:hidden"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderColor: "rgba(0,0,0,0.06)",
            }}
          >
        {/* ── Mobile layout ── */}
        <div className="md:hidden flex items-center h-14 px-2">
          {/* Left: hamburger */}
          <button
            onClick={toggleSidebar}
            aria-label="Toggle Navigation Menu"
            data-testid="mobile-menu-trigger"
            className="flex items-center justify-center size-11 rounded-xl text-slate-600 active:bg-slate-100 transition-colors"
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            <Menu className="size-5" strokeWidth={1.8} />
          </button>

          {/* Center: brand */}
          <div className="flex-1 flex justify-center items-center gap-2">
            <div
              className="flex items-center justify-center size-7 rounded-lg shrink-0"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", boxShadow: "0 2px 8px rgba(249,115,22,0.35)" }}
            >
              <GraduationCap className="size-3.5 text-white" strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-slate-900" style={{ fontSize: "0.82rem", fontWeight: 600, lineHeight: 1.1 }}>
                Jiddah Smart
              </span>
              <span className="text-slate-400" style={{ fontSize: "0.62rem", lineHeight: 1.1 }}>
                {currentPage}
              </span>
            </div>
          </div>

          {/* Right: search + bell + profile */}
          <div className="flex items-center gap-1 pr-1">
            <PowerSyncStatus />
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center size-11 rounded-xl text-slate-500 active:bg-slate-100 active:scale-95 transition-all"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              <Search className="size-5" strokeWidth={1.8} />
            </button>
            <NotificationBell size="mobile" />
            <UserProfileDropdown />
          </div>
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden md:flex items-center gap-3 h-14 px-5">
          <div className="flex items-center gap-3">
            <Breadcrumbs crumbs={breadcrumbs} />
          </div>
          <div className="flex-1 flex justify-center">
            <DesktopSearch />
          </div>
          <div className="flex items-center gap-2">
            <TermBadge />
            <PowerSyncStatus />
            <NotificationBell />
            <div className="w-px h-5 bg-slate-200 mx-0.5" />
            <UserProfileDropdown />
            <button
              onClick={() => setIsTopbarHidden(true)}
              className="flex items-center justify-center size-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1"
              title="Hide Topbar"
            >
              <ChevronUp className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </motion.header>
        )}
      </AnimatePresence>

      <MobileSearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
