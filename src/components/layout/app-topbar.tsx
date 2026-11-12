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
  LogOut,
  User,
  Settings,
  Menu,
  History,
  LifeBuoy,
  Sun,
  Moon,
  Sparkles,
  Monitor,
} from "lucide-react";
import { useSidebar } from "../figma-ui/ui/sidebar";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";
import { PowerSyncStatus } from "./PowerSyncStatus";
import { CommandPalette } from "./command-palette";
import { AutoTroubleshooter } from "@/components/system/auto-troubleshooter";
import { toast } from "sonner";
import { parseMarkAllReadResponse } from "@/lib/notification-response";
import { normalizeAccountRole } from "@/lib/teacher-access";
import {
  fetchActiveTermCached,
  fetchUnreadCountCached,
  invalidateClientCache,
  safeJsonFetch,
  getStoredThemeMode,
  setStoredThemeMode,
  type ThemeMode,
} from "@/lib/client-cache";

/** Shared easing/duration for every popover so they feel like one system. */
const POPOVER_TRANSITION = { duration: 0.15, ease: [0.16, 1, 0.3, 1] as const };
const POPOVER_MOTION = {
  initial: { opacity: 0, scale: 0.96, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -4 },
  transition: POPOVER_TRANSITION,
};
const POPOVER_SURFACE =
  "absolute right-0 top-full z-50 mt-2 origin-top-right overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xl";
const ICON_BUTTON =
  "relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-emerald-500";

const ROUTE_LABELS: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/marks": "Marks Entry",
  "/admin/students": "Students",
  "/admin/reports": "Report Center",
  "/admin/reports/studio": "Report Studio",
  "/admin/notifications": "Notifications",
  "/admin/teachers": "Teachers & Staff",
  "/admin/classes": "Classes",
  "/admin/subjects": "Subjects",
  "/admin/secular-hub": "Secular Hub",
  "/admin/theology-hub": "Theology Hub",
  "/admin/activity": "Activity Log",
  "/admin/invites": "Invites",
  "/admin/upload": "Upload Center",
  "/admin/uploads": "Upload Center",
  "/admin/settings": "School Settings",
  "/admin/account": "My Account",
  "/teacher/roll-call": "Daily Roll Call",
};

function useOutsideClose(ref: React.RefObject<HTMLElement | null>, close: () => void) {
  React.useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, close]);
}

/* ─── Term badge ────────────────────────────────────────────────────────── */

function TermBadge() {
  const [termName, setTermName] = React.useState<string>("");

  const loadActiveTerm = React.useCallback((force = false) => {
    if (force) {
      invalidateClientCache();
    }
    fetchActiveTermCached().then((data: any) => {
      if (!data) return;
      if (typeof data === "string") return setTermName(data);
      const label = data.label || "Active term";
      const year = String(data.academic_year || "");
      setTermName(year && !label.includes(year) ? `${label}, ${year}` : label);
    });
  }, []);

  React.useEffect(() => {
    loadActiveTerm(false);
    const onTermUpdated = () => loadActiveTerm(true);
    window.addEventListener("jiddah:active-term-changed", onTermUpdated);
    return () => {
      window.removeEventListener("jiddah:active-term-changed", onTermUpdated);
    };
  }, [loadActiveTerm]);

  if (!termName) return null;
  return (
    <span
      title="Active academic term"
      data-testid="topbar-active-term-badge"
      className="hidden h-8 shrink-0 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 text-xs font-semibold text-[var(--text-primary)] xl:inline-flex"
    >
      <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
      {termName}
    </span>
  );
}

/* ─── Theme switcher ────────────────────────────────────────────────────── */

const THEME_OPTIONS: { mode: ThemeMode; label: string; desc: string; icon: React.ElementType }[] = [
  { mode: "light", label: "Light", desc: "Light sidebar and workspace", icon: Sun },
  { mode: "dark", label: "Dark", desc: "Dark sidebar and workspace", icon: Moon },
  { mode: "hybrid", label: "Hybrid", desc: "Dark sidebar, light workspace", icon: Sparkles },
  { mode: "system", label: "System", desc: "Follow device preference", icon: Monitor },
];

function ThemeModeSwitcher() {
  const [mode, setMode] = React.useState<ThemeMode>("hybrid");
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useOutsideClose(ref, close);

  React.useEffect(() => {
    const sync = () => setMode(getStoredThemeMode());
    sync();
    window.addEventListener("jiddah-theme-changed", sync);
    return () => window.removeEventListener("jiddah-theme-changed", sync);
  }, []);

  const current = THEME_OPTIONS.find((t) => t.mode === mode) ?? THEME_OPTIONS[0];
  const CurrentIcon = current.icon;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Appearance: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Appearance: ${current.label}`}
        data-testid="theme-mode-switcher"
        className={ICON_BUTTON}
      >
        <CurrentIcon className="size-4" strokeWidth={1.75} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div {...POPOVER_MOTION} role="menu" className={cn(POPOVER_SURFACE, "w-60 p-1.5")}>
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Appearance
            </p>
            {THEME_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = mode === opt.mode;
              return (
                <button
                  key={opt.mode}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setStoredThemeMode(opt.mode);
                    setMode(opt.mode);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left outline-none transition-colors",
                    active
                      ? "bg-emerald-500/15 text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Icon className={cn("size-4 shrink-0", active && "text-emerald-600 dark:text-emerald-400")} strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[13px] font-semibold">{opt.label}</span>
                    <span className="block truncate text-[11px] text-[var(--text-muted)]">{opt.desc}</span>
                  </span>
                  {active && <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Notification bell ─────────────────────────────────────────────────── */

interface BellNotification {
  id: string | number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  priority: string;
  type: string;
}

function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [notifications, setNotifications] = React.useState<BellNotification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const close = React.useCallback(() => setOpen(false), []);
  useOutsideClose(ref, close);

  const syncUnreadCount = React.useCallback(async (force = false) => {
    setUnreadCount(await fetchUnreadCountCached(force));
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await safeJsonFetch<any>("/api/notifications");
      if (res?.ok && res.data) {
        const list = Array.isArray(res.data) ? res.data : Array.isArray(res.data.data) ? res.data.data : [];
        setNotifications(list.slice(0, 6));
      }
    } catch {
      // keep previous list
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
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleMarkRead = async (id: string | number) => {
    const prevNotifs = notifications;
    const prevCount = unreadCount;
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
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
        className={ICON_BUTTON}
      >
        <Bell className="size-4" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            data-testid="topbar-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-[var(--bg-card)] bg-emerald-600 px-1 text-[10px] font-bold tabular-nums leading-none text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            {...POPOVER_MOTION}
            className={cn(POPOVER_SURFACE, "fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-96")}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-[var(--bg-hover)] dark:text-emerald-300"
                >
                  <CheckCheck className="size-3.5" strokeWidth={1.75} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 divide-y divide-[var(--border)] overflow-y-auto">
              {loading ? (
                <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">Loading…</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-xs text-[var(--text-muted)]">You&apos;re all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <button
                    type="button"
                    key={String(n.id)}
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)]",
                      !n.read && "bg-emerald-500/[0.07]"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        n.priority === "high" ? "bg-rose-500" : n.priority === "medium" ? "bg-amber-500" : !n.read ? "bg-emerald-500" : "bg-[var(--border-strong)]"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate text-[13px]", n.read ? "font-medium" : "font-bold")}>{n.title}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--text-secondary)]">{n.message}</span>
                      <span className="mt-1 block text-[11px] tabular-nums text-[var(--text-muted)]">
                        {n.time ? new Date(n.time).toLocaleDateString() : ""}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center justify-center border-t border-[var(--border)] text-xs font-bold text-emerald-700 hover:bg-[var(--bg-hover)] dark:text-emerald-300"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Account menu ──────────────────────────────────────────────────────── */

function UserMenu({ onOpenDiagnostics }: { onOpenDiagnostics: () => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const close = React.useCallback(() => setOpen(false), []);
  useOutsideClose(ref, close);
  const [role, setRole] = React.useState<string>("Class Teacher");
  const [roleLabel, setRoleLabel] = React.useState<string>("Class Teacher");
  const [userName, setUserName] = React.useState<string>("Staff");
  const [email, setEmail] = React.useState<string>("");

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (!user) return;
      const rawRole = user.app_metadata?.role || user.user_metadata?.role || "Class Teacher";
      const subject = user.user_metadata?.subject || "";
      setRole(normalizeAccountRole(rawRole, subject));
      setRoleLabel(rawRole);
      setUserName(user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Staff");
      setEmail(user.email || "");
    });
  }, []);

  const canManage = role !== "Class Teacher";
  const initials =
    userName
      .split(/[\s._-]+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleLogout = async () => {
    const supabase = createClient();
    invalidateClientCache();
    try {
      const { clearOfflineCaches } = await import("@/lib/offline-sync");
      await clearOfflineCaches();
    } catch {
      // offline cache clear is best-effort
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const itemClass =
    "flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-[var(--text-secondary)] outline-none transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:bg-[var(--bg-hover)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-9 cursor-pointer items-center gap-2 rounded-lg pl-1 pr-2 outline-none transition-colors hover:bg-[var(--bg-hover)] focus-visible:ring-2 focus-visible:ring-emerald-500",
          open && "bg-[var(--bg-hover)]"
        )}
      >
        <span className="grid size-7 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">{initials}</span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold text-[var(--text-primary)]">{userName}</span>
          <span className="block max-w-[140px] truncate text-[11px] text-[var(--text-muted)]">{roleLabel}</span>
        </span>
        <ChevronDown className={cn("hidden size-3.5 text-[var(--text-muted)] transition-transform lg:block", open && "rotate-180")} strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div {...POPOVER_MOTION} role="menu" className={cn(POPOVER_SURFACE, "w-64 p-1.5")}>
            <div className="border-b border-[var(--border)] px-2.5 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-bold">{userName}</p>
              {email && <p className="truncate text-xs text-[var(--text-muted)]">{email}</p>}
            </div>
            <div className="py-1.5">
              <button type="button" role="menuitem" onClick={() => go("/admin/account")} className={itemClass}>
                <User className="size-4" strokeWidth={1.75} /> My account
              </button>
              {canManage && (
                <>
                  <button type="button" role="menuitem" onClick={() => go("/admin/settings")} className={itemClass}>
                    <Settings className="size-4" strokeWidth={1.75} /> School settings
                  </button>
                  <button type="button" role="menuitem" onClick={() => go("/admin/activity")} className={itemClass}>
                    <History className="size-4" strokeWidth={1.75} /> Activity log
                  </button>
                </>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onOpenDiagnostics();
                }}
                className={itemClass}
              >
                <LifeBuoy className="size-4" strokeWidth={1.75} /> Run diagnostics
              </button>
            </div>
            <div className="border-t border-[var(--border)] pt-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex h-9 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[13px] font-semibold text-rose-600 outline-none transition-colors hover:bg-rose-500/10 dark:text-rose-400"
              >
                <LogOut className="size-4" strokeWidth={1.75} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Topbar ────────────────────────────────────────────────────────────── */

interface AppTopbarProps {
  breadcrumbs?: string[];
  currentPage?: string;
}

export function AppTopbar({ breadcrumbs, currentPage }: AppTopbarProps) {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  const resolvedPage =
    currentPage ||
    ROUTE_LABELS[pathname] ||
    Object.entries(ROUTE_LABELS)
      .filter(([k]) => k !== "/admin" && pathname.startsWith(k))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ||
    "Dashboard";
  const crumbs = breadcrumbs || (pathname === "/admin" ? [resolvedPage] : ["Dashboard", resolvedPage]);

  React.useEffect(() => setHidden(false), [pathname]);

  React.useEffect(() => {
    const toggle = () => setHidden((prev) => !prev);
    window.addEventListener("toggle-topbar", toggle);
    return () => window.removeEventListener("toggle-topbar", toggle);
  }, []);

  React.useEffect(() => {
    const supabase = createClient();
    let lastUid: string | null = null;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: any) => {
      const nextUid = session?.user?.id || null;
      if (lastUid !== null && lastUid !== nextUid) {
        invalidateClientCache();
        window.dispatchEvent(new CustomEvent("notifications-updated"));
      }
      lastUid = nextUid;
    });
    return () => subscription?.unsubscribe();
  }, []);

  return (
    <>
      <AnimatePresence>
        {hidden && (
          <motion.button
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            onClick={() => setHidden(false)}
            className="fixed right-1/2 top-0 z-50 flex h-8 translate-x-1/2 cursor-pointer items-center rounded-b-lg border border-t-0 border-[var(--border)] bg-[var(--bg-card)] px-4 text-[var(--text-secondary)] shadow-md hover:text-[var(--text-primary)] print:hidden"
            aria-label="Show topbar"
          >
            <ChevronDown className="size-4" strokeWidth={1.75} />
          </motion.button>
        )}
      </AnimatePresence>

      {!hidden && (
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--bg-card)] px-3 text-[var(--text-primary)] print:hidden md:px-5">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            data-testid="mobile-menu-trigger"
            className={cn(ICON_BUTTON, "md:hidden")}
          >
            <Menu className="size-5" strokeWidth={1.75} />
          </button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <React.Fragment key={`${crumb}-${i}`}>
                  {i > 0 && <ChevronRight className="hidden size-3.5 shrink-0 text-[var(--text-muted)] sm:block" strokeWidth={1.75} />}
                  <span
                    aria-current={last ? "page" : undefined}
                    className={cn(
                      "truncate",
                      last ? "font-bold text-[var(--text-primary)]" : "hidden font-medium text-[var(--text-muted)] sm:inline"
                    )}
                  >
                    {crumb}
                  </span>
                </React.Fragment>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages and actions"
              className="hidden h-9 w-64 cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-sunken)] px-3 text-left text-[13px] text-[var(--text-muted)] outline-none transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] focus-visible:ring-2 focus-visible:ring-emerald-500 lg:flex"
            >
              <Search className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">Search pages and actions</span>
              <kbd className="rounded border border-[var(--border)] bg-[var(--bg-card)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--text-secondary)]">
                Ctrl K
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search pages and actions"
              className={cn(ICON_BUTTON, "lg:hidden")}
            >
              <Search className="size-4" strokeWidth={1.75} />
            </button>

            <TermBadge />
            <PowerSyncStatus />
            <ThemeModeSwitcher />
            <NotificationBell />
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" />
            <UserMenu onOpenDiagnostics={() => setDiagnosticsOpen(true)} />
          </div>
        </header>
      )}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <AutoTroubleshooter open={diagnosticsOpen} onOpenChange={setDiagnosticsOpen} />
    </>
  );
}
