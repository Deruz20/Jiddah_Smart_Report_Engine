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
  Sun,
  Moon,
  Sparkles,
  Monitor,
} from "lucide-react";
import { useSidebar } from "../figma-ui/ui/sidebar";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";
import { PowerSyncStatus } from "./PowerSyncStatus";
import { toast } from "sonner";
import { parseMarkAllReadResponse } from "@/lib/notification-response";
import { normalizeAccountRole } from "@/lib/teacher-access";
import {
  fetchActiveTermCached,
  fetchUnreadCountCached,
  safeJsonFetch,
  getStoredThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from "@/lib/client-cache";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/marks": "Marks Entry",
  "/admin/students": "Students",
  "/admin/reports": "Report Center",
  "/admin/notifications": "Notifications",
  "/admin/teachers": "Teachers & Staff",
  "/admin/classes": "Classes",
  "/admin/subjects": "Subjects",
  "/admin/secular-hub": "Secular Hub",
  "/admin/theology-hub": "Theology Hub",
  "/admin/activity": "Activity Log",
  "/admin/invites": "Invites",
  "/admin/upload": "Uploads",
  "/admin/settings": "Settings",
};

/* ─── Breadcrumbs (desktop only) ─────────────────────────────────────────── */

function Breadcrumbs({ crumbs }: { crumbs: string[] }) {
  return (
    <nav className="hidden md:flex items-center gap-1.5 min-w-0 flex-nowrap" aria-label="Breadcrumb navigation">
      <Home className="size-3.5 text-stone-400 shrink-0" strokeWidth={1.8} />
      {crumbs.map((crumb, i) => (
        <React.Fragment key={crumb}>
          <ChevronRight className="size-3 text-stone-300 shrink-0" strokeWidth={2} />
          <span
            className={cn(
              "transition-colors duration-150 truncate max-w-[140px] xl:max-w-[220px]",
              i === crumbs.length - 1
                ? "text-stone-900 font-semibold"
                : "text-stone-500 hover:text-stone-800 cursor-pointer",
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
  const router = useRouter();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      const q = query.trim().toLowerCase();
      if (q.includes("mark")) router.push("/admin/marks");
      else if (q.includes("report")) router.push("/admin/reports");
      else if (q.includes("student")) router.push("/admin/students");
      else if (q.includes("class")) router.push("/admin/classes");
      else if (q.includes("setting")) router.push("/admin/settings");
      else router.push(`/admin/students`);
    }
  };

  return (
    <div
      className={cn(
        "relative hidden lg:flex items-center gap-2 min-h-[40px] h-10 px-3 rounded-xl transition-colors duration-200 border w-48 xl:w-72",
        focused
          ? "bg-white border-emerald-500/50 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]"
          : "bg-[#FAF7F2] border-stone-200 hover:bg-stone-100/80 hover:border-stone-300",
      )}
    >
      <Search
        className={cn("size-3.5 shrink-0 transition-colors duration-200", focused ? "text-[#059669]" : "text-stone-400")}
        strokeWidth={2}
      />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Search students, classes..."
        className="flex-1 bg-transparent outline-none text-stone-800 placeholder:text-stone-400 min-w-0"
        style={{ fontSize: "0.8rem" }}
      />
      <AnimatePresence>
        {!focused && (
          <motion.kbd
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-stone-600 font-semibold bg-stone-200/80 border border-stone-300"
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

const recentSearches = ["Primary 5 — Marks Sheet", "Term 1 Report Cards", "Student Roster"];
const quickActions = [
  { label: "Marks Entry", href: "/admin/marks", icon: ClipboardEdit, color: "#059669", bg: "rgba(5,150,105,0.08)", border: "rgba(5,150,105,0.2)" },
  { label: "Reports", href: "/admin/reports", icon: FileText, color: "#D97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.2)" },
  { label: "Students", href: "/admin/students", icon: Users, color: "#2563EB", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.2)" },
];

function MobileSearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");
  const router = useRouter();

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
            style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 left-0 right-0 z-50 md:hidden rounded-b-3xl overflow-hidden bg-[#FDFBF7] border-b border-stone-200 shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 pt-6 pb-3">
              <div className="flex-1 flex items-center gap-3 min-h-[44px] h-11 px-4 rounded-2xl bg-white border border-stone-300">
                <Search className="size-4 text-[#059669] shrink-0" strokeWidth={2} />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students, classes, reports..."
                  className="flex-1 bg-transparent outline-none text-stone-800 placeholder:text-stone-400"
                  style={{ fontSize: "0.9rem" }}
                />
                {query && (
                  <button onClick={() => setQuery("")} className="min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 text-stone-400">
                    <X className="size-4" strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                onClick={onClose}
                className="min-h-[44px] px-3 shrink-0 text-[#059669] font-semibold"
                style={{ fontSize: "0.88rem" }}
              >
                Cancel
              </button>
            </div>

            {!query ? (
              <div className="px-4 pb-6">
                <p className="text-stone-500 uppercase tracking-widest mb-2.5" style={{ fontSize: "0.64rem", fontWeight: 700 }}>
                  Recent Searches
                </p>
                <div className="flex flex-col">
                  {recentSearches.map((s) => (
                    <button key={s} onClick={onClose} className="min-h-[44px] flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-0 active:bg-stone-100 rounded-xl px-2">
                      <div className="flex items-center justify-center size-8 rounded-xl shrink-0 bg-stone-100">
                        <Clock className="size-3.5 text-stone-500" strokeWidth={2} />
                      </div>
                      <span className="text-stone-800 flex-1 text-left text-sm">{s}</span>
                      <ChevronRight className="size-3.5 text-stone-400" strokeWidth={2.5} />
                    </button>
                  ))}
                </div>

                <p className="text-stone-500 uppercase tracking-widest mb-3 mt-5" style={{ fontSize: "0.64rem", fontWeight: 700 }}>
                  Quick Actions
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  {quickActions.map(({ label, href, icon: Icon, color, bg, border }) => (
                    <button
                      key={label}
                      onClick={() => {
                        onClose();
                        router.push(href);
                      }}
                      className="min-h-[44px] flex flex-col items-center justify-center gap-2 p-3.5 rounded-2xl active:scale-95 transition-transform duration-100"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <Icon className="size-5" style={{ color }} strokeWidth={1.8} />
                      <span style={{ fontSize: "0.72rem", color, fontWeight: 600, lineHeight: 1.2, textAlign: "center" }}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 pb-6">
                <p className="text-stone-500 py-6 text-center text-sm">
                  Press Enter to jump to &ldquo;{query}&rdquo;
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Term Badge (desktop only, deduplicated cache) ──────────────────────── */

function TermBadge() {
  const [termName, setTermName] = React.useState<string>("Active Term");

  React.useEffect(() => {
    let active = true;
    fetchActiveTermCached().then((data) => {
      if (!active || !data) return;
      const label = data.label || "Active Term";
      const yearStr = String(data.academic_year || "");
      if (yearStr && label.includes(yearStr)) {
        setTermName(label);
      } else if (yearStr) {
        setTermName(`${label}, ${yearStr}`);
      } else {
        setTermName(label);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 bg-emerald-50/90 border border-emerald-200/80 tabular-nums">
      <div className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
      <span className="text-emerald-900 font-semibold text-xs">{termName}</span>
    </div>
  );
}

/* ─── Quick Theme Mode Switcher ─────────────────────────────────────────── */

const THEME_OPTIONS: { mode: ThemeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { mode: "hybrid", label: "Hybrid", desc: "Dark sidebar + light workspace", icon: Sparkles },
  { mode: "light", label: "Light", desc: "Warm paper light mode", icon: Sun },
  { mode: "dark", label: "Dark", desc: "Full dark slate mode", icon: Moon },
  { mode: "system", label: "System", desc: "Follow device preference", icon: Monitor },
];

function ThemeModeSwitcher() {
  const [mode, setMode] = React.useState<ThemeMode>("hybrid");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const sync = () => setMode(getStoredThemeMode());
    sync();
    window.addEventListener("jiddah-theme-changed", sync);
    return () => window.removeEventListener("jiddah-theme-changed", sync);
  }, []);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentOpt = THEME_OPTIONS.find((t) => t.mode === mode) || THEME_OPTIONS[0];
  const CurrentIcon = currentOpt.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Theme mode: ${currentOpt.label}`}
        title={`Theme: ${currentOpt.label} (${currentOpt.desc})`}
        data-testid="theme-mode-switcher"
        className="flex items-center justify-center gap-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] px-2.5"
      >
        <CurrentIcon className="size-4 text-emerald-700" strokeWidth={2} />
        <span className="hidden lg:inline text-xs font-semibold text-stone-700">
          {currentOpt.label}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-stone-200 p-1.5 z-50 shadow-xl"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Appearance Mode
            </div>
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    setStoredThemeMode(opt.mode);
                    setMode(opt.mode);
                    setOpen(false);
                    toast.success(`Theme set to ${opt.label}`);
                  }}
                  className={cn(
                    "w-full min-h-[40px] flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer",
                    active
                      ? "bg-emerald-50 text-emerald-900 font-bold"
                      : "text-stone-700 hover:bg-stone-100 font-medium"
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", active ? "text-emerald-600" : "text-stone-500")}
                    strokeWidth={2}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs leading-tight">{opt.label}</div>
                    <div className="text-[10px] text-stone-500 font-normal truncate">{opt.desc}</div>
                  </div>
                  {active && <div className="size-2 rounded-full bg-emerald-600 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Notification Bell (Event-Driven, Deduplicated Cache) ───────────────── */

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
  const pathname = usePathname();

  const syncUnreadCount = React.useCallback(async (force = false) => {
    const count = await fetchUnreadCountCached(force);
    setUnreadCount(count);
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const json = await safeJsonFetch<{ data?: BellNotification[] }>("/api/notifications");
      if (json?.data) {
        setNotifications(json.data.slice(0, 6));
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    syncUnreadCount(false);
  }, [syncUnreadCount, pathname]);

  React.useEffect(() => {
    const handleSync = () => {
      syncUnreadCount(true);
      if (open) fetchNotifications();
    };
    window.addEventListener("notifications-updated", handleSync);
    return () => window.removeEventListener("notifications-updated", handleSync);
  }, [syncUnreadCount, fetchNotifications, open]);

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
    const prevNotifs = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const res = await fetch(`/api/notifications/${id}/mark-read`, { method: "POST" });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to mark notification as read");
      }
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    } catch (err: any) {
      setNotifications(prevNotifs);
      setUnreadCount(prevCount);
      toast.error(err.message || "Failed to mark notification as read");
    }
  };

  const handleMarkAllRead = async () => {
    const prevNotifs = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    const { requestFailed, isPartialSuccess, errorMessage } = await parseMarkAllReadResponse(
      fetch("/api/notifications/mark-all-read", { method: "POST" })
    );

    if (requestFailed) {
      setNotifications(prevNotifs);
      setUnreadCount(prevCount);
      toast.error(isPartialSuccess ? "Some notifications could not be updated." : errorMessage);
    } else {
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className={cn(
          "relative flex items-center justify-center rounded-xl text-stone-600 transition-all duration-200 cursor-pointer min-h-[44px] min-w-[44px] size-11",
          size === "mobile"
            ? "hover:bg-stone-100 active:bg-stone-100"
            : "hover:text-stone-900 hover:bg-stone-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Bell className={size === "mobile" ? "size-4" : "size-[1.1rem]"} strokeWidth={1.8} />
        {unreadCount > 0 && (
          <span
            data-testid="topbar-unread-badge"
            className="absolute top-1.5 right-1.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#059669] text-white text-[10px] font-bold border-2 border-white shadow-sm flex items-center justify-center tabular-nums"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed right-3 left-3 top-16 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-80 rounded-2xl bg-white border border-stone-200 overflow-hidden z-50 shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 bg-[#FAF7F2]">
              <div className="flex items-center gap-2">
                <span className="text-stone-900 text-sm font-bold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold tabular-nums">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="min-h-[36px] px-2 flex items-center gap-1 text-[11px] font-semibold text-[#059669] hover:underline transition cursor-pointer"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-stone-100">
              {loading ? (
                <div className="px-4 py-6 text-center text-xs text-stone-500">Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-stone-500">No recent notifications</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={String(n.id)}
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-stone-50 transition-colors cursor-pointer",
                      !n.read ? "bg-[#FAF7F2]" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "mt-1.5 size-2 rounded-full shrink-0",
                        n.priority === "high"
                          ? "bg-rose-600"
                          : n.priority === "medium"
                          ? "bg-amber-600"
                          : !n.read
                          ? "bg-[#059669]"
                          : "bg-stone-300"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs text-stone-900 truncate", !n.read ? "font-bold" : "font-medium")}>
                        {n.title}
                      </p>
                      <p className="text-[11px] text-stone-600 line-clamp-2 mt-0.5">{n.message}</p>
                      <p className="text-[10px] text-stone-500 mt-1 tabular-nums">
                        {n.time ? new Date(n.time).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-2 border-t border-stone-200 bg-[#FAF7F2] text-center">
              <Link
                href="/admin/notifications"
                onClick={() => setOpen(false)}
                className="min-h-[40px] flex items-center justify-center text-xs font-bold text-[#059669] hover:underline"
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
  const [role, setRole] = React.useState<string>("Class Teacher");
  const [rawRoleDisplay, setRawRoleDisplay] = React.useState<string>("Class Teacher");
  const [userName, setUserName] = React.useState<string>("Staff");

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user) {
        const rawRole = user.app_metadata?.role || user.user_metadata?.role || "Class Teacher";
        const subject = user.user_metadata?.subject || "";
        const normalized = normalizeAccountRole(rawRole, subject);
        setRole(normalized);
        setRawRoleDisplay(rawRole || normalized);
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Staff");
      }
    });
  }, []);

  const isTeacherOnly = role === "Class Teacher";

  const handleLogout = async () => {
    const supabase = createClient();
    try {
      const { powerSync } = await import("../providers/PowerSyncProvider");
      await powerSync.disconnectAndClear();
    } catch {
      // ignore offline cache clear error
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

  const menuActions = [
    { icon: User, label: "My Profile & Alerts", href: "/admin/notifications" },
    ...(!isTeacherOnly ? [{ icon: Settings, label: "School Settings", href: "/admin/settings" }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="User profile menu"
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1.5 sm:gap-2.5 min-h-[44px] min-w-[44px] p-1.5 sm:p-2 lg:px-3 lg:py-2 rounded-xl transition-all duration-200 active:scale-95 cursor-pointer",
          open ? "bg-stone-100 shadow-sm" : "hover:bg-stone-100",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div
          className="flex items-center justify-center size-8 sm:size-9 rounded-xl text-white font-bold shrink-0 bg-[#059669]"
          style={{ fontSize: "0.75rem" }}
        >
          {userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || userName.slice(0, 2).toUpperCase()}
        </div>
        <div className="hidden lg:block text-left">
          <p className="text-stone-900 font-semibold leading-tight" style={{ fontSize: "0.78rem" }}>{userName}</p>
          <p className="text-stone-500 font-medium leading-tight" style={{ fontSize: "0.68rem" }}>{rawRoleDisplay}</p>
        </div>
        <ChevronDown
          className={cn("hidden lg:block size-3.5 text-stone-400 transition-transform duration-200", open && "rotate-180")}
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
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-stone-200 overflow-hidden z-50 origin-top-right shadow-xl"
          >
            <div className="p-4 border-b border-stone-200 bg-[#FAF7F2]">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center size-10 rounded-xl text-white font-bold shrink-0 bg-[#059669]"
                  style={{ fontSize: "0.8rem" }}
                >
                  {userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || userName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-stone-900 font-bold truncate" style={{ fontSize: "0.9rem" }}>{userName}</p>
                  <p className="text-stone-600 truncate" style={{ fontSize: "0.75rem" }}>{rawRoleDisplay}</p>
                </div>
              </div>
            </div>
            <div className="p-1.5">
              {menuActions.map(({ icon: Icon, label, href }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(href);
                  }}
                  className="min-h-[44px] flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-stone-700 hover:text-stone-900 hover:bg-stone-50 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  style={{ fontSize: "0.85rem", fontWeight: 600 }}
                >
                  <Icon className="size-4 text-stone-500" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
            <div className="p-1.5 border-t border-stone-200 mt-1">
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-700 hover:bg-red-50 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                style={{ fontSize: "0.85rem", fontWeight: 600 }}
              >
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

export function AppTopbar({ breadcrumbs, currentPage }: AppTopbarProps) {
  const { toggleSidebar } = useSidebar();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();
  const [isTopbarHidden, setIsTopbarHidden] = React.useState(false);

  const resolvedPage =
    currentPage ||
    ROUTE_LABELS[pathname] ||
    Object.entries(ROUTE_LABELS).find(([k]) => k !== "/admin" && pathname.startsWith(k))?.[1] ||
    "Dashboard";

  const resolvedCrumbs = breadcrumbs || ["Admin", resolvedPage];

  React.useEffect(() => {
    setIsTopbarHidden(false);
  }, [pathname]);

  React.useEffect(() => {
    const handleToggle = () => setIsTopbarHidden((prev) => !prev);
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
            className="fixed top-0 right-1/2 translate-x-1/2 z-50 bg-[#FDFBF7] border border-t-0 border-stone-200 rounded-b-xl shadow-md min-h-[44px] px-4 text-stone-600 hover:text-[#059669] hover:bg-stone-50 transition-colors print:hidden"
            title="Show Topbar"
            aria-label="Show Topbar"
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
            className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#FDFBF7]/95 backdrop-blur-md print:hidden"
          >
            {/* ── Mobile layout ── */}
            <div className="md:hidden flex items-center justify-between h-14 px-2 gap-1 min-w-0">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Toggle Navigation Menu"
                data-testid="mobile-menu-trigger"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] size-11 rounded-xl text-stone-700 active:bg-stone-100 transition-colors shrink-0 cursor-pointer"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <Menu className="size-5" strokeWidth={1.8} />
              </button>

              <div className="flex items-center gap-1.5 min-w-0 shrink">
                <div className="flex items-center justify-center size-7 rounded-lg shrink-0 bg-[#059669] text-white shadow-sm">
                  <GraduationCap className="size-3.5 text-white" strokeWidth={2} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-stone-900 truncate font-bold leading-tight text-xs">
                    {resolvedPage}
                  </span>
                  <span className="text-stone-500 truncate leading-tight text-[10px]">
                    Jiddah Smart
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <PowerSyncStatus />
                <ThemeModeSwitcher />
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Search"
                  className="flex items-center justify-center min-h-[44px] min-w-[44px] size-11 rounded-xl text-stone-600 active:bg-stone-100 transition-all cursor-pointer"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <Search className="size-4" strokeWidth={1.8} />
                </button>
                <NotificationBell size="mobile" />
                <UserProfileDropdown />
              </div>
            </div>

            {/* ── Desktop layout ── */}
            <div className="hidden md:flex items-center justify-between gap-3 lg:gap-6 h-14 px-3 lg:px-5 min-w-0">
              <div className="flex items-center gap-2 min-w-0 shrink">
                <Breadcrumbs crumbs={resolvedCrumbs} />
              </div>
              <div className="hidden lg:flex flex-1 justify-center max-w-xs mx-2 min-w-0">
                <DesktopSearch />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <TermBadge />
                <PowerSyncStatus />
                <ThemeModeSwitcher />
                <NotificationBell />
                <div className="w-px h-5 bg-stone-200 mx-0.5 hidden sm:block" />
                <UserProfileDropdown />
                <button
                  type="button"
                  onClick={() => setIsTopbarHidden(true)}
                  className="hidden lg:flex items-center justify-center min-h-[44px] min-w-[44px] size-11 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors ml-1 cursor-pointer"
                  title="Hide Topbar"
                  aria-label="Hide Topbar"
                >
                  <ChevronUp className="size-4" strokeWidth={2.5} />
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
