"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
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
  Layers,
  GraduationCap,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "../figma-ui/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../figma-ui/ui/tooltip";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";
import {
  normalizeAccountRole,
  type CanonicalAccountRole,
} from "@/lib/teacher-access";
import { resolveUserScope } from "@/lib/access-scope";
import {
  fetchSchoolSettingsCached,
  getStoredThemeMode,
  resolveEffectiveTheme,
} from "@/lib/client-cache";

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
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: ClipboardEdit,
    label: "Marks Entry",
    teacherLabel: "Marks Entry",
    id: "marks",
    href: "/admin/marks",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: Users,
    label: "Students",
    teacherLabel: "Students",
    id: "students",
    href: "/admin/students",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: Layers,
    label: "Classes",
    teacherLabel: "Classes",
    id: "classes",
    href: "/admin/classes",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: GraduationCap,
    label: "Subjects",
    teacherLabel: "Subjects",
    id: "subjects",
    href: "/admin/subjects",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: CalendarCheck,
    label: "Daily Roll Call",
    id: "roll-call",
    href: "/teacher/roll-call",
    roles: ["Administrator", "Principal", "Head Teacher", "Class Teacher"],
  },
  {
    icon: FileText,
    label: "Report Center",
    teacherLabel: "Report Center",
    id: "reports",
    href: "/admin/reports",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
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
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "Class Teacher"],
    department: "secular",
  },
  {
    icon: BookOpen,
    label: "Theology Hub",
    id: "theology-hub",
    href: "/admin/theology-hub",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Theology", "Class Teacher"],
    department: "theology",
  },
  {
    icon: UserCheck,
    label: "Teachers & Staff",
    id: "teachers",
    href: "/admin/teachers",
    roles: ["Administrator"],
  },
  {
    icon: UploadCloud,
    label: "Upload Center",
    id: "uploads",
    href: "/admin/upload",
    roles: ["Administrator", "Principal", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
];

export function getVisibleNavItemsForRole(role: string, subject?: string | null): NavItemConfig[] {
  const scope = resolveUserScope({ role, subject, status: "active" });

  return ROLE_GATED_NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(scope.canonicalRole)) return false;
    if (item.department === "secular" && !scope.canAccessSecularHub) return false;
    if (item.department === "theology" && !scope.canAccessTheologyHub) return false;

    if (scope.isTeacher && !scope.isClassTeacher) {
      // Pure Subject Teacher scope: Dashboard, Marks Entry, Subjects, and department Hub
      return ["dashboard", "marks", "subjects", "secular-hub", "theology-hub"].includes(item.id);
    }

    return true;
  });
}

function isRouteActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ─── Nav Item ───────────────────────────────────────────────────────────── */

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: NavItemConfig;
  active: boolean;
  collapsed: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const Icon = item.icon;
  const subItems = (item.children ?? []).filter((c) => c.href !== item.href);
  const hasSub = subItems.length > 0;
  const subActive = subItems.some((c) => isRouteActive(pathname, c.href));
  const [open, setOpen] = React.useState(active || subActive);

  React.useEffect(() => {
    if (active || subActive) setOpen(true);
  }, [active, subActive]);

  if (collapsed) {
    return (
      <SidebarMenuItem className="flex justify-center my-0.5">
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              data-testid={`nav-item-${item.id}`}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              onClick={() => isMobile && setOpenMobile(false)}
              className={cn(
                "relative size-10 rounded-full flex items-center justify-center transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
                active
                  ? "text-[#09472C] dark:text-[#FDE68A] font-semibold"
                  : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-pill-collapsed"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 ring-1 ring-[#0D5C3A]/20 shadow-[0_2px_10px_-2px_rgba(13,92,58,0.12)] dark:from-[#10B981]/20 dark:via-[#F59E0B]/15 dark:to-[#EA580C]/15 dark:ring-[#F59E0B]/25 dark:shadow-[0_2px_12px_-2px_rgba(245,158,11,0.15)]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className="relative z-10 size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem className="flex flex-col my-0.5">
      <Link
        href={item.href}
        data-testid={`nav-item-${item.id}`}
        aria-current={active ? "page" : undefined}
        onClick={() => isMobile && setOpenMobile(false)}
        className={cn(
          "relative rounded-full flex items-center font-medium transition-colors outline-none group",
          isMobile
            ? "h-10 px-4 text-[14px] gap-3.5"
            : "h-9 px-3 text-[13.5px] gap-3",
          "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
          active
            ? "text-[#09472C] dark:text-[#FDE68A] font-semibold"
            : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active-pill"
            className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 ring-1 ring-[#0D5C3A]/20 shadow-[0_2px_10px_-2px_rgba(13,92,58,0.12)] dark:from-[#10B981]/20 dark:via-[#F59E0B]/15 dark:to-[#EA580C]/15 dark:ring-[#F59E0B]/25 dark:shadow-[0_2px_12px_-2px_rgba(245,158,11,0.15)]"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
        <Icon className="relative z-10 size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="relative z-10 flex-1 truncate">{item.label}</span>
        {hasSub && (
          <button
            type="button"
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            aria-expanded={open}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="relative z-10 size-6 rounded-full flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
          >
            <ChevronRight
              className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")}
              strokeWidth={1.75}
            />
          </button>
        )}
      </Link>

      {hasSub && open && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5 pl-3 border-l border-black/[0.06] dark:border-white/[0.08]">
          {subItems.map((child) => {
            const childActive = isRouteActive(pathname, child.href);
            return (
              <Link
                key={child.id}
                href={child.href}
                aria-current={childActive ? "page" : undefined}
                onClick={() => isMobile && setOpenMobile(false)}
                className={cn(
                  "relative h-8 px-3 rounded-full flex items-center text-[12.5px] font-medium transition-colors outline-none",
                  childActive
                    ? "bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 text-[#09472C] font-semibold ring-1 ring-[#0D5C3A]/20 shadow-xs dark:from-[#10B981]/20 dark:via-[#F59E0B]/15 dark:to-[#EA580C]/15 dark:text-[#FDE68A] dark:ring-[#F59E0B]/25"
                    : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
                )}
              >
                <span className="truncate">{child.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </SidebarMenuItem>
  );
}

/* ─── App Sidebar ────────────────────────────────────────────────────────── */

export function AppSidebar() {
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed" && !isMobile;

  const [canonicalRole, setCanonicalRole] = React.useState<CanonicalAccountRole>("Administrator");
  const [rawRoleDisplay, setRawRoleDisplay] = React.useState("Administrator");
  const [rawSubject, setRawSubject] = React.useState("");
  const [userName, setUserName] = React.useState("Staff");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [schoolName, setSchoolName] = React.useState("Jiddah");

  React.useEffect(() => {
    const sync = () => {
      const resolved = resolveEffectiveTheme(getStoredThemeMode());
      document.documentElement.dataset.sidebarTheme = resolved.sidebarDark ? "dark" : "light";
    };
    sync();
    window.addEventListener("jiddah-theme-changed", sync);
    return () => window.removeEventListener("jiddah-theme-changed", sync);
  }, []);

  React.useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const custom = event as CustomEvent<Record<string, any>>;
      const detail = custom.detail || {};
      if (typeof detail.full_name === "string" && detail.full_name.trim()) {
        setUserName(detail.full_name.trim());
      }
      if (typeof detail.avatar_url === "string" && detail.avatar_url.trim()) {
        setAvatarUrl(detail.avatar_url.trim());
      }
    };
    window.addEventListener("jiddah:profile-updated", onProfileUpdated);
    return () => window.removeEventListener("jiddah:profile-updated", onProfileUpdated);
  }, []);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }: any) => {
      const user = data.session?.user;
      if (!user) return;
      let rawRole = user.app_metadata?.role || user.user_metadata?.role || "Administrator";
      let subject = user.user_metadata?.subject || "";
      let displayName =
        user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Staff";
      let resolvedAvatar = user.user_metadata?.avatar_url || null;

      if (user.email) {
        try {
          const { data: teacherRow } = await supabase
            .from("teachers")
            .select("name, role, subject, avatar")
            .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
            .maybeSingle();
          if (teacherRow?.role) rawRole = teacherRow.role;
          if (teacherRow?.subject) subject = teacherRow.subject;
          if (teacherRow?.name) displayName = teacherRow.name;
          if ((teacherRow as any)?.avatar) resolvedAvatar = (teacherRow as any).avatar;
        } catch {
          // fallback to session metadata
        }
      }

      setCanonicalRole(normalizeAccountRole(rawRole, subject));
      setRawRoleDisplay(rawRole);
      setRawSubject(subject);
      setUserName(displayName);
      setAvatarUrl(resolvedAvatar);
    });

    let active = true;
    fetchSchoolSettingsCached()
      .then((data) => {
        if (!active || !data) return;
        const raw = data.school_name || data.name;
        if (raw && !String(raw).toLowerCase().includes("nursery and primary")) {
          setSchoolName(String(raw));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isTeacherOnly = canonicalRole === "Class Teacher";
  const visible = getVisibleNavItemsForRole(rawRoleDisplay || canonicalRole, rawSubject);
  const initials =
    userName
      .split(/[\s._-]+/)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const isSettingsActive = isRouteActive(pathname, "/admin/settings");
  const isAccountActive = isRouteActive(pathname, "/admin/account");

  return (
    <Sidebar
      collapsible="icon"
      className="print:hidden z-40 border-r border-black/[0.05] dark:border-white/[0.06] bg-[#F0F4F9] dark:bg-[#1E1F20] transition-[width] duration-200 ease-in-out"
      style={
        {
          "--sidebar-width": "260px",
          "--sidebar-width-icon": "64px",
        } as React.CSSProperties
      }
    >
      {/* ─── Header / Morph Slot ────────────────────────────────────────── */}
      {collapsed ? (
        <SidebarHeader className="h-16 shrink-0 justify-center p-0 bg-[#F0F4F9] dark:bg-[#1E1F20]">
          <div className="flex justify-center">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Open sidebar"
                  className="size-10 rounded-full flex items-center justify-center relative group/logo cursor-pointer hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]"
                >
                  <Image
                    src="/logo-512h.png"
                    alt="Jiddah Emblem"
                    width={24}
                    height={24}
                    className="size-6 object-contain transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:opacity-0 group-hover/logo:scale-75 group-hover/logo:blur-[2px]"
                  />
                  <PanelLeftOpen
                    className="size-5 absolute inset-0 m-auto opacity-0 scale-75 blur-[2px] transition-all duration-[180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/logo:opacity-100 group-hover/logo:scale-100 group-hover/logo:blur-none text-[#444746] dark:text-[#C4C7C5]"
                    strokeWidth={1.75}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Open sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarHeader>
      ) : isMobile ? (
        <SidebarHeader className="flex flex-row items-center justify-between px-4 pt-3.5 pb-2.5 shrink-0 bg-white dark:bg-[#1E1F20] border-b-0">
          <Link
            href="/admin"
            aria-label={`${schoolName} — dashboard`}
            onClick={() => setOpenMobile(false)}
            className="flex items-center gap-2.5 outline-none rounded-lg"
          >
            <Image
              src="/logo-512h.png"
              alt="Jiddah Emblem"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
            <span className="text-[18px] font-medium tracking-tight text-[#1F1F1F] dark:text-[#E3E3E3]">
              {schoolName || "Jiddah"}
            </span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Quick Search"
              data-testid="mobile-sidebar-search-btn"
              onClick={() => {
                setOpenMobile(false);
                window.dispatchEvent(new CustomEvent("jiddah:open-command-palette"));
              }}
              className="w-9.5 h-9.5 rounded-full flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-95 transition-all outline-none"
            >
              <Search className="size-5" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              aria-label="Close menu"
              data-testid="mobile-sidebar-close-btn"
              onClick={() => setOpenMobile(false)}
              className="w-9.5 h-9.5 rounded-full flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] active:scale-95 transition-all outline-none"
            >
              <X className="size-5" strokeWidth={1.75} />
            </button>
          </div>
        </SidebarHeader>
      ) : (
        <SidebarHeader className="h-14 shrink-0 flex flex-row items-center justify-between px-3.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-[#F0F4F9] dark:bg-[#1E1F20]">
          <Link
            href="/admin"
            aria-label={`${schoolName} — dashboard`}
            onClick={() => isMobile && setOpenMobile(false)}
            className="flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A] rounded-lg"
          >
            <Image
              src="/logo-512h.png"
              alt="Jiddah Emblem"
              width={24}
              height={24}
              className="size-6 object-contain"
            />
            <span className="text-[17px] font-semibold text-[#1F1F1F] dark:text-[#E3E3E3] tracking-tight truncate">
              {schoolName}
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("jiddah:open-command-palette"))}
                  aria-label="Quick Search"
                  className="size-8 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.08] flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]"
                >
                  <Search className="size-[18px]" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={6}>
                Search (⌘K)
              </TooltipContent>
            </Tooltip>

            {!isMobile && (
              <Tooltip delayDuration={150}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label="Close sidebar"
                    className="size-9 rounded-full hover:bg-black/[0.08] dark:hover:bg-white/[0.08] flex items-center justify-center text-[#444746] dark:text-[#C4C7C5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0D5C3A]"
                  >
                    <PanelLeftClose className="size-4" strokeWidth={1.75} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Close sidebar
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarHeader>
      )}

      {/* ─── Navigation (Zero Uppercase Section Clutter) ────────────────── */}
      <SidebarContent className={cn("gap-0 overflow-x-hidden px-2.5 py-2", isMobile ? "bg-white dark:bg-[#1E1F20]" : "bg-[#F0F4F9] dark:bg-[#1E1F20]")}>
        <nav aria-label="Primary" className="flex flex-col">
          <SidebarMenu className={cn("gap-0.5", isMobile && "space-y-1")}>
            {visible.map((item) => (
              <NavItem
                key={item.id}
                item={{ ...item, label: isTeacherOnly && item.teacherLabel ? item.teacherLabel : item.label }}
                active={isRouteActive(pathname, item.href)}
                collapsed={collapsed}
              />
            ))}
          </SidebarMenu>
        </nav>
      </SidebarContent>

      {/* ─── Pinned Bottom Footer ────────────────────────────────────────── */}
      <SidebarFooter className={cn("shrink-0 border-t border-black/[0.05] dark:border-white/[0.06] p-2 mt-auto", isMobile ? "bg-white dark:bg-[#1E1F20]" : "bg-[#F0F4F9] dark:bg-[#1E1F20]")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5 py-1">
            {/* School Settings Gear */}
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/settings"
                  aria-label="School Settings"
                  aria-current={isSettingsActive ? "page" : undefined}
                  className={cn(
                    "relative size-10 rounded-full flex items-center justify-center transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
                    isSettingsActive
                      ? "text-[#09472C] dark:text-[#FDE68A] font-semibold"
                      : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
                  )}
                >
                  {isSettingsActive && (
                    <motion.div
                      layoutId="sidebar-active-pill-collapsed"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 ring-1 ring-[#0D5C3A]/20 dark:from-[#10B981]/20 dark:via-[#F59E0B]/15 dark:to-[#EA580C]/15 dark:ring-[#F59E0B]/25"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Settings className="relative z-10 size-[18px]" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                School Settings
              </TooltipContent>
            </Tooltip>

            {/* User Account Circle */}
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/account"
                  aria-label={`${userName} — account`}
                  className="size-10 rounded-full flex items-center justify-center transition-colors outline-none hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
                >
                  {avatarUrl ? (
                    <img
                      data-testid="sidebar-user-avatar-img"
                      src={avatarUrl}
                      alt={userName}
                      className="size-8 rounded-full object-cover shadow-xs"
                    />
                  ) : (
                    <span
                      data-testid="sidebar-user-avatar-initials"
                      className="size-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#0D5C3A] to-[#0A4A2F] text-[11px] font-bold text-white shadow-xs"
                    >
                      {initials}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                {userName} · {rawRoleDisplay}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2 py-1 gap-2">
            {/* User Account Info on Left */}
            <Link
              href="/admin/account"
              aria-current={isAccountActive ? "page" : undefined}
              onClick={() => isMobile && setOpenMobile(false)}
              className={cn(
                "flex-1 min-w-0 h-10 px-2 rounded-full flex items-center gap-2.5 outline-none hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors",
                isAccountActive && "bg-black/[0.04] dark:bg-white/[0.06]"
              )}
            >
              {avatarUrl ? (
                <img
                  data-testid="sidebar-user-avatar-img"
                  src={avatarUrl}
                  alt={userName}
                  className="size-8 shrink-0 rounded-full object-cover shadow-xs"
                />
              ) : (
                <span
                  data-testid="sidebar-user-avatar-initials"
                  className="size-8 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-[#0D5C3A] to-[#0A4A2F] text-[11px] font-bold text-white shadow-xs"
                >
                  {initials}
                </span>
              )}
              <span className="min-w-0 leading-tight">
                <span
                  data-testid="sidebar-user-name"
                  className="block truncate text-[13px] font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]"
                >
                  {userName}
                </span>
                <span className="block truncate text-[11px] font-medium text-[#747775] dark:text-[#8E918F]">
                  {rawRoleDisplay}
                </span>
              </span>
            </Link>

            {/* School Settings Gear on Far-Right of the Exact Same Horizontal Row */}
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <Link
                  href="/admin/settings"
                  aria-label="School Settings"
                  aria-current={isSettingsActive ? "page" : undefined}
                  onClick={() => isMobile && setOpenMobile(false)}
                  className={cn(
                    "size-9 shrink-0 rounded-full flex items-center justify-center transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
                    isSettingsActive
                      ? "bg-gradient-to-r from-[#0D5C3A]/14 via-[#D97706]/10 to-[#EA580C]/12 text-[#09472C] dark:from-[#10B981]/20 dark:via-[#F59E0B]/15 dark:to-[#EA580C]/15 dark:text-[#FDE68A] font-semibold ring-1 ring-[#0D5C3A]/20 dark:ring-[#F59E0B]/25 shadow-xs"
                      : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
                  )}
                >
                  <Settings className="size-5" strokeWidth={1.75} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                School Settings
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
