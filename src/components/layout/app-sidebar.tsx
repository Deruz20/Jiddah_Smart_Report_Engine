"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  FileText,
  ScrollText,
  BookOpen,
  UserCheck,
  UploadCloud,
  CalendarCheck,
  Search,
  Bell,
  MoreHorizontal,
  Settings,
  History,
  LogOut,
  SmilePlus,
  Monitor,
  Sun,
  Moon,
  LifeBuoy,
  ChevronRight,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
  SidebarGroup,
  SidebarGroupContent,
} from "../figma-ui/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../figma-ui/ui/tooltip";
import { cn } from "../figma-ui/ui/utils";
import { JiddahLogo } from "@/components/brand/JiddahLogo";
import { createClient } from "@/utils/supabase/client";
import {
  normalizeAccountRole,
  resolveRoleDepartment,
  type CanonicalAccountRole,
} from "@/lib/teacher-access";
import {
  fetchSchoolSettingsCached,
  getStoredThemeMode,
  applyThemeModeToDom,
  resolveEffectiveTheme,
  invalidateClientCache,
  type ThemeMode,
} from "@/lib/client-cache";
import { CommandPalette } from "./command-palette";
import { AutoTroubleshooter } from "@/components/system/auto-troubleshooter";

export interface NavChildConfig {
  label: string;
  href: string;
  id: string;
}

export interface NavItemConfig {
  icon: React.ElementType;
  label: string;
  teacherLabel?: string;
  id: string;
  href: string;
  roles: CanonicalAccountRole[];
  department?: "secular" | "theology";
  children?: NavChildConfig[];
}

export const ROLE_GATED_NAV_ITEMS: NavItemConfig[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    id: "dashboard",
    href: "/admin",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: Users,
    label: "Students",
    teacherLabel: "Students",
    id: "students",
    href: "/admin/students",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: ClipboardEdit,
    label: "Marks Entry",
    teacherLabel: "Marks Entry",
    id: "marks",
    href: "/admin/marks",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: FileText,
    label: "Report Center",
    teacherLabel: "Report Center",
    id: "reports",
    href: "/admin/reports",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
    children: [
      { label: "Report Center", href: "/admin/reports", id: "reports-overview" },
      { label: "Report Studio 2.0", href: "/admin/reports/studio", id: "reports-studio" },
    ],
  },
  {
    icon: ScrollText,
    label: "Secular Hub",
    id: "secular-hub",
    href: "/admin/secular-hub",
    roles: ["Administrator", "Head Teacher", "DOS Secular"],
    department: "secular",
  },
  {
    icon: BookOpen,
    label: "Theology Hub",
    id: "theology-hub",
    href: "/admin/theology-hub",
    roles: ["Administrator", "Head Teacher", "DOS Theology"],
    department: "theology",
  },
  {
    icon: CalendarCheck,
    label: "Daily Roll Call",
    id: "roll-call",
    href: "/teacher/roll-call",
    roles: ["Administrator", "Head Teacher", "Class Teacher"],
  },
  {
    icon: UserCheck,
    label: "Teachers & Staff",
    id: "teachers",
    href: "/admin/teachers",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
  {
    icon: UploadCloud,
    label: "Upload Center",
    id: "uploads",
    href: "/admin/upload",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
];

export function getVisibleNavItemsForRole(role: string, subject?: string | null): NavItemConfig[] {
  const canonical = normalizeAccountRole(role, subject);
  const dept = resolveRoleDepartment(role, subject);
  return ROLE_GATED_NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(canonical)) return false;
    if (item.department && dept !== "both" && item.department !== dept) return false;
    return true;
  });
}

function NavItem({
  item,
  active,
  collapsed,
  accentColor,
  sidebarDark,
}: {
  item: NavItemConfig;
  active?: boolean;
  collapsed: boolean;
  accentColor: string;
  sidebarDark: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const Icon = item.icon;
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isChildActive = hasChildren && item.children?.some((c) => pathname === c.href);
  const [expanded, setExpanded] = React.useState(active || isChildActive);

  React.useEffect(() => {
    if (active || isChildActive) {
      setExpanded(true);
    }
  }, [active, isChildActive]);

  const isActive = active || (item.id === "dashboard" && pathname === "/admin");

  return (
    <SidebarMenuItem className="flex flex-col">
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className="relative flex items-center w-full">
            <Link
              href={item.href}
              data-testid={`nav-item-${item.id}`}
              onClick={() => isMobile && setOpenMobile(false)}
              className={cn(
                "group/nav-item relative flex items-center min-h-[44px] w-full rounded-xl outline-none transition-all duration-150",
                collapsed ? "justify-center p-1" : "px-3 h-11",
                collapsed && isActive
                  ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold"
                  : collapsed
                  ? sidebarDark
                    ? "text-slate-400 hover:text-white hover:bg-white/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  : isActive
                  ? sidebarDark
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold"
                  : sidebarDark
                  ? "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium"
              )}
            >
              {isActive && !collapsed && (
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-emerald-500"
                />
              )}

              <div
                className={cn(
                  "relative z-10 flex items-center justify-center shrink-0 transition-transform duration-150 group-hover/nav-item:scale-105",
                  collapsed ? "size-10" : "size-7"
                )}
              >
                <Icon
                  className={cn(
                    collapsed ? "size-5" : "size-4",
                    collapsed && isActive
                      ? "text-slate-950"
                      : isActive
                      ? sidebarDark
                        ? "text-emerald-400"
                        : "text-emerald-700"
                      : sidebarDark
                      ? "text-slate-400 group-hover/nav-item:text-white"
                      : "text-slate-600 group-hover/nav-item:text-slate-900"
                  )}
                  strokeWidth={collapsed && isActive ? 2.2 : 1.75}
                />
              </div>

              <AnimatePresence mode="popLayout">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0, x: -10 }}
                    animate={{ opacity: 1, width: "auto", x: 0 }}
                    exit={{ opacity: 0, width: 0, x: -10 }}
                    transition={{
                      opacity: { duration: 0.15 },
                      width: { type: "spring", stiffness: 400, damping: 40 },
                      x: { duration: 0.15 },
                    }}
                    className={cn(
                      "relative z-10 text-xs ml-2.5 overflow-hidden whitespace-nowrap flex-1",
                      isActive
                        ? sidebarDark
                          ? "text-emerald-400 font-bold"
                          : "text-emerald-900 font-bold"
                        : sidebarDark
                        ? "text-slate-300 group-hover/nav-item:text-white font-medium"
                        : "text-slate-700 group-hover/nav-item:text-slate-900 font-medium"
                    )}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {hasChildren && !collapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpanded((prev) => !prev);
                }}
                className={cn(
                  "relative z-20 size-7 mr-1.5 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
                  sidebarDark
                    ? "text-stone-400 hover:text-white hover:bg-white/10"
                    : "text-stone-500 hover:text-stone-900 hover:bg-stone-200"
                )}
                aria-label={expanded ? "Collapse menu" : "Expand menu"}
              >
                {expanded ? (
                  <ChevronDown className="size-3.5" strokeWidth={1.75} />
                ) : (
                  <ChevronRight className="size-3.5" strokeWidth={1.75} />
                )}
              </button>
            )}
          </div>
        </TooltipTrigger>

        {collapsed && (
          <TooltipContent
            side="right"
            sideOffset={18}
            className="bg-stone-900 border-stone-800 text-stone-100 text-xs shadow-xl font-medium z-[100] px-3 py-1.5 rounded-lg"
          >
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>

      {/* Collapsible Children Sub-menu */}
      {hasChildren && !collapsed && expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          className="pl-9 pr-2 py-1 space-y-1 overflow-hidden"
        >
          {item.children?.map((child) => {
            const isSubActive = pathname === child.href;
            return (
              <Link
                key={child.id}
                href={child.href}
                onClick={() => isMobile && setOpenMobile(false)}
                className={cn(
                  "block text-[11px] py-1 px-2.5 rounded-lg transition-colors",
                  isSubActive
                    ? sidebarDark
                      ? "text-emerald-400 font-bold bg-emerald-500/10"
                      : "text-emerald-700 font-bold bg-emerald-50"
                    : sidebarDark
                    ? "text-stone-400 hover:text-stone-200 hover:bg-white/5"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </motion.div>
      )}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = state === "collapsed";
  const [canonicalRole, setCanonicalRole] = React.useState<CanonicalAccountRole>("Administrator");
  const [rawRoleDisplay, setRawRoleDisplay] = React.useState<string>("Administrator");
  const [rawSubject, setRawSubject] = React.useState<string>("");
  const [userName, setUserName] = React.useState<string>("Staff");
  const [userEmail, setUserEmail] = React.useState<string>("");
  const [accentColor, setAccentColor] = React.useState<string>("#059669");
  const [schoolName, setSchoolName] = React.useState<string>("JIDDAH ISLAMIC SCHOOLS");
  const [sidebarDark, setSidebarDark] = React.useState<boolean>(true);
  const [themeMode, setThemeMode] = React.useState<ThemeMode>("dark");
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState<boolean>(false);
  const [troubleshooterOpen, setTroubleshooterOpen] = React.useState<boolean>(false);
  const [quickActionsOpen, setQuickActionsOpen] = React.useState<boolean>(false);
  const [unreadCount, setUnreadCount] = React.useState<number>(0);
  const [isOnline, setIsOnline] = React.useState<boolean>(true);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const syncTheme = () => {
      const mode = getStoredThemeMode();
      setThemeMode(mode);
      const resolved = resolveEffectiveTheme(mode);
      setSidebarDark(resolved.sidebarDark);
    };
    syncTheme();
    window.addEventListener("jiddah-theme-changed", syncTheme);
    return () => window.removeEventListener("jiddah-theme-changed", syncTheme);
  }, []);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Close Quick Actions card when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setQuickActionsOpen(false);
      }
    };
    if (quickActionsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [quickActionsOpen]);

  // Auth & Settings Load
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user) {
        const rawRole = user.app_metadata?.role || user.user_metadata?.role || "Administrator";
        const subject = user.user_metadata?.subject || "";
        const normalized = normalizeAccountRole(rawRole, subject);
        setCanonicalRole(normalized);
        setRawRoleDisplay(rawRole || normalized);
        setRawSubject(subject);
        setUserName(user.user_metadata?.full_name || user.email?.split("@")[0] || "Staff");
        setUserEmail(user.email || "");

        // Initial unread notifications count
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .or(`recipient_id.eq.${user.id},recipient_id.is.null`)
          .then(({ count }) => {
            if (typeof count === "number") setUnreadCount(count);
          });
      }
    });

    let active = true;
    fetchSchoolSettingsCached()
      .then((data) => {
        if (!active || !data) return;
        if (data.theme_color) setAccentColor(data.theme_color);
        if (data.school_name || data.name) {
          const raw = data.school_name || data.name;
          setSchoolName(
            raw && !raw.toLowerCase().includes("nursery and primary")
              ? String(raw).toUpperCase()
              : "JIDDAH ISLAMIC SCHOOLS"
          );
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  // Dedicated Realtime Notification Subscription with safe cleanup
  React.useEffect(() => {
    if (!userEmail) return;
    const supabase = createClient();
    const channelName = `sidebar-notifs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      () => {
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("read", false)
          .then(({ count }) => {
            if (typeof count === "number") setUnreadCount(count);
          });
      }
    );

    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [userEmail]);

  const handleLogout = async () => {
    const supabase = createClient();
    invalidateClientCache();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleThemeChange = (mode: ThemeMode) => {
    applyThemeModeToDom(mode);
    setThemeMode(mode);
    window.dispatchEvent(new Event("jiddah-theme-changed"));
  };

  const visibleItems = getVisibleNavItemsForRole(rawRoleDisplay || canonicalRole, rawSubject);
  const isTeacherOnly = canonicalRole === "Class Teacher";

  const sidebarBg = sidebarDark ? "var(--sidebar-background, #090C0A)" : "#FAF7F2";
  const sidebarBorder = sidebarDark ? "var(--sidebar-border, #1E293B)" : "#E7E2D7";

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r-0 print:hidden z-40"
        style={
          {
            "--sidebar-width": "16.5rem",
            "--sidebar-background": sidebarBg,
            "--sidebar-border": sidebarBorder,
          } as React.CSSProperties
        }
      >
        {/* Header - Natural Logo Shield & School Branding */}
        <SidebarHeader
          className={cn(
            "px-4 pt-4 pb-2 border-r shadow-none z-20 transition-colors",
            sidebarDark
              ? "bg-[#090C0A] border-[#1E293B]"
              : "bg-[#FAF7F2] border-[#E7E2D7]"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <button
              type="button"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={cn(
                "min-h-[44px] flex items-center gap-3 min-w-0 cursor-pointer group/logo bg-transparent border-0 text-left p-1 rounded-xl",
                collapsed && "flex-col justify-center"
              )}
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {/* Natural Shield Logo without enclosing circle/box */}
              <div className="relative shrink-0 flex items-center justify-center py-1">
                <JiddahLogo
                  height={collapsed ? 38 : 42}
                  className="w-auto drop-shadow-sm transition-transform duration-200 group-hover/logo:scale-105"
                  paper="transparent"
                />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    <p
                      className={cn(
                        "font-extrabold tracking-tight truncate max-w-[165px] uppercase",
                        sidebarDark ? "text-white" : "text-[#1C1917]"
                      )}
                      style={{ fontSize: "0.78rem", lineHeight: 1.2 }}
                    >
                      {schoolName}
                    </p>
                    <p
                      className={cn(
                        "font-medium truncate max-w-[165px]",
                        sidebarDark ? "text-[#94A3B8]" : "text-[#78716C]"
                      )}
                      style={{ fontSize: "0.68rem", lineHeight: 1.25 }}
                    >
                      {rawRoleDisplay || canonicalRole}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Quick Find Bar (⌘K) */}
          {!collapsed ? (
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors mt-2 cursor-pointer outline-none",
                sidebarDark
                  ? "bg-white/[0.04] hover:bg-white/[0.08] text-stone-400 border-white/[0.08] hover:text-stone-200"
                  : "bg-black/[0.03] hover:bg-black/[0.06] text-stone-600 border-stone-200 hover:text-stone-900"
              )}
            >
              <div className="flex items-center gap-2">
                <Search className="size-3.5 opacity-70" strokeWidth={1.75} />
                <span>Find anything...</span>
              </div>
              <kbd
                className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded border leading-none font-semibold",
                  sidebarDark
                    ? "bg-white/5 border-white/10 text-stone-400"
                    : "bg-stone-100 border-stone-200 text-stone-600"
                )}
              >
                ⌘K
              </kbd>
            </button>
          ) : (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCommandPaletteOpen(true)}
                  className={cn(
                    "size-9 flex items-center justify-center rounded-lg border transition-colors mx-auto mt-2 cursor-pointer",
                    sidebarDark
                      ? "bg-white/[0.04] hover:bg-white/[0.08] text-stone-400 border-white/[0.08] hover:text-stone-200"
                      : "bg-black/[0.03] hover:bg-black/[0.06] text-stone-600 border-stone-200 hover:text-stone-900"
                  )}
                  aria-label="Quick search (⌘K)"
                >
                  <Search className="size-4" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={18}
                className="bg-stone-900 border-stone-800 text-stone-100 text-xs shadow-xl font-medium z-[100] px-3 py-1.5 rounded-lg"
              >
                Search (⌘K)
              </TooltipContent>
            </Tooltip>
          )}
        </SidebarHeader>

        {/* Navigation Items */}
        <SidebarContent
          className={cn(
            "px-3 pt-2 overflow-x-hidden border-r shadow-none z-10 relative transition-colors",
            sidebarDark
              ? "bg-[#090C0A] border-[#1E293B]"
              : "bg-[#FAF7F2] border-[#E7E2D7]"
          )}
        >
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {visibleItems.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const displayLabel =
                    isTeacherOnly && item.teacherLabel ? item.teacherLabel : item.label;
                  return (
                    <NavItem
                      key={item.id}
                      item={{ ...item, label: displayLabel }}
                      active={active}
                      collapsed={collapsed}
                      accentColor={accentColor}
                      sidebarDark={sidebarDark}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Pinned Bottom Dock [Avatar Display Name] [⋯] [🔔] */}
        <SidebarFooter
          className={cn(
            "relative p-2.5 pb-3 border-r border-t shadow-none z-30 transition-colors",
            sidebarDark
              ? "bg-[#090C0A] border-[#1E293B] border-t-[#1E293B]"
              : "bg-[#FAF7F2] border-[#E7E2D7] border-t-[#E7E2D7]/70"
          )}
        >
          {/* Spring-Animated Quick Actions Popover Card */}
          <AnimatePresence>
            {quickActionsOpen && (
              <motion.div
                ref={popoverRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 28,
                  mass: 0.8,
                }}
                className={cn(
                  "absolute bottom-full mb-2.5 left-2 right-2 rounded-2xl p-3 border shadow-2xl font-sans z-[120] space-y-3",
                  sidebarDark
                    ? "bg-[#111714] border-white/10 text-white"
                    : "bg-white border-stone-200 text-stone-900"
                )}
                style={{
                  minWidth: collapsed ? "240px" : undefined,
                  left: collapsed ? "12px" : "8px",
                }}
              >
                {/* 1. Identity Row */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-emerald-500 text-black font-extrabold text-xs flex items-center justify-center shrink-0">
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase() || "JD"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate leading-tight">{userName}</p>
                      <p className="text-[10px] text-stone-400 truncate leading-tight">
                        {userEmail || rawRoleDisplay || canonicalRole}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/admin/settings"
                    onClick={() => setQuickActionsOpen(false)}
                    className="size-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer"
                    title="School Settings"
                  >
                    <Settings className="size-4" strokeWidth={1.75} />
                  </Link>
                </div>

                {/* 2. Primary CTA Pill */}
                {isTeacherOnly ? (
                  <Link
                    href="/admin/marks"
                    onClick={() => setQuickActionsOpen(false)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs flex items-center justify-between shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <ClipboardEdit className="size-3.5" strokeWidth={2} />
                      <span>Enter Class Marks</span>
                    </div>
                    <ChevronRight className="size-3.5" strokeWidth={2.5} />
                  </Link>
                ) : (
                  <Link
                    href="/admin/reports/studio"
                    onClick={() => setQuickActionsOpen(false)}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-lime-500 text-black font-extrabold text-xs flex items-center justify-between shadow-md hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-3.5" strokeWidth={2} />
                      <span>Open Report Studio</span>
                    </div>
                    <ChevronRight className="size-3.5" strokeWidth={2.5} />
                  </Link>
                )}

                {/* 3. 3-Way Segmented Theme Switcher */}
                <div
                  className={cn(
                    "grid grid-cols-3 p-1 rounded-xl text-[11px] font-semibold border",
                    sidebarDark
                      ? "bg-black/40 border-white/10"
                      : "bg-stone-100 border-stone-200"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleThemeChange("system")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 rounded-lg transition-all cursor-pointer",
                      themeMode === "system"
                        ? "bg-emerald-500 text-black font-bold shadow-xs"
                        : "text-stone-400 hover:text-white"
                    )}
                  >
                    <Monitor className="size-3" strokeWidth={1.75} />
                    <span>Auto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 rounded-lg transition-all cursor-pointer",
                      themeMode === "light"
                        ? "bg-emerald-500 text-black font-bold shadow-xs"
                        : "text-stone-400 hover:text-white"
                    )}
                  >
                    <Sun className="size-3" strokeWidth={1.75} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 py-1 rounded-lg transition-all cursor-pointer",
                      themeMode === "dark"
                        ? "bg-emerald-500 text-black font-bold shadow-xs"
                        : "text-stone-400 hover:text-white"
                    )}
                  >
                    <Moon className="size-3" strokeWidth={1.75} />
                    <span>Dark</span>
                  </button>
                </div>

                {/* 4. Menu Action Rows */}
                <div className="space-y-0.5 pt-1 text-xs font-medium">
                  <Link
                    href="/admin"
                    onClick={() => setQuickActionsOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <LayoutDashboard className="size-3.5 text-stone-400" strokeWidth={1.75} />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/admin/activity"
                    onClick={() => setQuickActionsOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <History className="size-3.5 text-amber-400" strokeWidth={1.75} />
                    <span>Activity Log</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickActionsOpen(false);
                      setTroubleshooterOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <LifeBuoy className="size-3.5 text-sky-400" strokeWidth={1.75} />
                    <span>Auto-Troubleshoot</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickActionsOpen(false);
                      alert("Feedback recorded! Thank you for helping us improve Jiddah Smart Engine.");
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left cursor-pointer"
                  >
                    <SmilePlus className="size-3.5 text-emerald-400" strokeWidth={1.75} />
                    <span>Give Feedback</span>
                  </button>
                  <div className="pt-1 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors text-left cursor-pointer font-semibold"
                    >
                      <LogOut className="size-3.5" strokeWidth={1.75} />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>

                {/* 5. System Health Status Indicator */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-stone-400 font-medium">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        isOnline
                          ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"
                          : "bg-amber-500"
                      )}
                    />
                    <span>{isOnline ? "All Systems Operational" : "Offline Rehearsal"}</span>
                  </div>
                  <span className="font-mono text-[9px] opacity-75">v2.4.0</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Dock Control Bar */}
          <div className="flex items-center gap-1.5 w-full">
            {/* Identity & Avatar Trigger */}
            <button
              type="button"
              onClick={() => setQuickActionsOpen((prev) => !prev)}
              aria-label="User account actions"
              className={cn(
                "flex-1 min-w-0 min-h-[44px] text-left flex items-center gap-2.5 p-1 rounded-xl cursor-pointer transition-colors duration-150 bg-transparent border-0",
                sidebarDark ? "hover:bg-white/5" : "hover:bg-black/5",
                collapsed && "justify-center"
              )}
            >
              <div className="relative shrink-0">
                <div
                  className="flex items-center justify-center size-8 rounded-xl text-white font-bold tracking-wider"
                  style={{
                    backgroundColor: sidebarDark ? "#059669" : accentColor,
                    fontSize: "0.72rem",
                  }}
                >
                  {userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || userName.slice(0, 2).toUpperCase()}
                </div>
                <div
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2",
                    isOnline ? "bg-emerald-500" : "bg-amber-500",
                    sidebarDark ? "border-[#090C0A]" : "border-[#FAF7F2]"
                  )}
                />
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0 text-left overflow-hidden">
                  <p
                    className={cn(
                      "font-bold truncate text-xs",
                      sidebarDark ? "text-white" : "text-[#1C1917]"
                    )}
                  >
                    {userName}
                  </p>
                  <p className="font-medium truncate text-[10px] text-emerald-400">
                    {rawRoleDisplay || canonicalRole}
                  </p>
                </div>
              )}
            </button>

            {/* Quick Actions ⋯ Button */}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setQuickActionsOpen((prev) => !prev)}
                title="Quick Actions"
                aria-label="Quick Actions"
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                  quickActionsOpen
                    ? "bg-emerald-500 text-black font-bold"
                    : sidebarDark
                    ? "text-stone-400 hover:text-white hover:bg-white/10"
                    : "text-stone-500 hover:text-stone-900 hover:bg-black/5"
                )}
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </button>
            )}

            {/* Notifications 🔔 Button with Realtime Live Badge */}
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/notifications"
                  title="Notifications"
                  aria-label="Notifications"
                  className={cn(
                    "relative size-8 rounded-lg flex items-center justify-center shrink-0 transition-colors cursor-pointer",
                    sidebarDark
                      ? "text-stone-400 hover:text-white hover:bg-white/10"
                      : "text-stone-500 hover:text-stone-900 hover:bg-black/5"
                  )}
                >
                  <Bell className="size-4" strokeWidth={1.75} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 bg-emerald-500 text-black font-extrabold text-[9px] rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-stone-900 border-stone-800 text-stone-100 text-xs shadow-xl font-medium z-[100] px-3 py-1.5 rounded-lg"
              >
                {unreadCount > 0 ? `${unreadCount} unread notification(s)` : "Notifications"}
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Global Command Palette (⌘K) */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Auto-Troubleshooter Dialog */}
      <AutoTroubleshooter
        open={troubleshooterOpen}
        onOpenChange={setTroubleshooterOpen}
      />
    </>
  );
}
