"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
    icon: Users,
    label: "Students",
    teacherLabel: "Students",
    id: "students",
    href: "/admin/students",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: Layers,
    label: "Classes",
    teacherLabel: "Classes",
    id: "classes",
    href: "/admin/classes",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: GraduationCap,
    label: "Subjects",
    teacherLabel: "Subjects",
    id: "subjects",
    href: "/admin/subjects",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: CalendarCheck,
    label: "Daily Roll Call",
    id: "roll-call",
    href: "/teacher/roll-call",
    roles: ["Administrator", "Head Teacher", "Class Teacher"],
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
    roles: ["Administrator", "Head Teacher", "DOS Secular", "Class Teacher"],
    department: "secular",
  },
  {
    icon: BookOpen,
    label: "Theology Hub",
    id: "theology-hub",
    href: "/admin/theology-hub",
    roles: ["Administrator", "Head Teacher", "DOS Theology", "Class Teacher"],
    department: "theology",
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
                "size-10 rounded-full flex items-center justify-center transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
                active
                  ? "bg-[#D3E3FD] text-[#041E49] dark:bg-[#282A2C] dark:text-[#E3E3E3] font-semibold shadow-xs"
                  : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
            </Link>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
          >
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
          "h-9 px-3 rounded-full flex items-center gap-3 text-[13.5px] font-medium transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#0D5C3A] dark:focus-visible:ring-[#34D399]",
          active
            ? "bg-[#D3E3FD] text-[#041E49] dark:bg-[#282A2C] dark:text-[#E3E3E3] font-semibold shadow-xs"
            : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
        )}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 truncate">{item.label}</span>
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
            className="size-6 rounded-full flex items-center justify-center hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
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
                  "h-8 px-3 rounded-full flex items-center text-[12.5px] font-medium transition-colors outline-none",
                  childActive
                    ? "bg-[#D3E3FD] text-[#041E49] dark:bg-[#282A2C] dark:text-[#E3E3E3] font-semibold"
                    : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
                )}
              >
                {child.label}
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
  const { state, toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed" && !isMobile;

  const [canonicalRole, setCanonicalRole] = React.useState<CanonicalAccountRole>("Administrator");
  const [rawRoleDisplay, setRawRoleDisplay] = React.useState("Administrator");
  const [rawSubject, setRawSubject] = React.useState("");
  const [userName, setUserName] = React.useState("Staff");
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
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }: any) => {
      const user = data.session?.user;
      if (!user) return;
      let rawRole = user.app_metadata?.role || user.user_metadata?.role || "Administrator";
      let subject = user.user_metadata?.subject || "";
      let displayName =
        user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Staff";

      if (user.email) {
        try {
          const { data: teacherRow } = await supabase
            .from("teachers")
            .select("name, role, subject")
            .eq("email", user.email)
            .maybeSingle();
          if (teacherRow?.role) rawRole = teacherRow.role;
          if (teacherRow?.subject) subject = teacherRow.subject;
          if (teacherRow?.name) displayName = teacherRow.name;
        } catch {
          // fallback to session metadata
        }
      }

      setCanonicalRole(normalizeAccountRole(rawRole, subject));
      setRawRoleDisplay(rawRole);
      setRawSubject(subject);
      setUserName(displayName);
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
                    className="size-6 object-contain group-hover/logo:opacity-0 group-hover/logo:scale-75 transition-all duration-200"
                  />
                  <PanelLeftOpen
                    className="size-5 absolute inset-0 m-auto opacity-0 scale-75 group-hover/logo:opacity-100 group-hover/logo:scale-100 transition-all duration-200 text-[#444746] dark:text-[#C4C7C5]"
                    strokeWidth={1.75}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={12}
                className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
              >
                Open sidebar
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarHeader>
      ) : (
        <SidebarHeader className="h-14 shrink-0 flex flex-row items-center justify-between px-3.5 border-b border-black/[0.05] dark:border-white/[0.06] bg-[#F0F4F9] dark:bg-[#1E1F20]">
          <Link
            href="/admin"
            aria-label={`${schoolName} — dashboard`}
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
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
              >
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
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
                >
                  Close sidebar
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </SidebarHeader>
      )}

      {/* ─── Navigation (Zero Uppercase Section Clutter) ────────────────── */}
      <SidebarContent className="gap-0 overflow-x-hidden bg-[#F0F4F9] dark:bg-[#1E1F20] px-2.5 py-2">
        <nav aria-label="Primary" className="flex flex-col">
          <SidebarMenu className="gap-0.5">
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
      <SidebarFooter className="shrink-0 gap-1 border-t border-black/[0.05] dark:border-white/[0.06] bg-[#F0F4F9] dark:bg-[#1E1F20] p-2">
        {/* School Settings Gear */}
        {collapsed ? (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Link
                href="/admin/settings"
                aria-label="School Settings"
                aria-current={isSettingsActive ? "page" : undefined}
                className={cn(
                  "size-10 rounded-full flex items-center justify-center mx-auto transition-colors outline-none",
                  isSettingsActive
                    ? "bg-[#D3E3FD] text-[#041E49] dark:bg-[#282A2C] dark:text-[#E3E3E3] font-semibold shadow-xs"
                    : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
                )}
              >
                <Settings className="size-[18px]" strokeWidth={1.75} />
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
            >
              School Settings
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/admin/settings"
            aria-current={isSettingsActive ? "page" : undefined}
            className={cn(
              "h-9 px-3 rounded-full flex items-center gap-3 text-[13.5px] font-medium transition-colors outline-none",
              isSettingsActive
                ? "bg-[#D3E3FD] text-[#041E49] dark:bg-[#282A2C] dark:text-[#E3E3E3] font-semibold shadow-xs"
                : "text-[#444746] dark:text-[#C4C7C5] hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-[#1F1F1F] dark:hover:text-[#E3E3E3]"
            )}
          >
            <Settings className="size-[18px] shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate">School Settings</span>
          </Link>
        )}

        {/* User Account Circle */}
        {collapsed ? (
          <Tooltip delayDuration={150}>
            <TooltipTrigger asChild>
              <Link
                href="/admin/account"
                aria-label={`${userName} — account`}
                className="size-10 rounded-full flex items-center justify-center mx-auto transition-colors outline-none hover:bg-black/[0.08] dark:hover:bg-white/[0.08]"
              >
                <span className="size-8 rounded-full flex items-center justify-center bg-[#0D5C3A] text-[11px] font-bold text-white shadow-xs">
                  {initials}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              sideOffset={12}
              className="bg-[#1F1F1F] text-white dark:bg-[#E3E3E3] dark:text-[#131314] text-xs font-medium px-3 py-1.5 rounded-full shadow-md border-none"
            >
              {userName} · {rawRoleDisplay}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/admin/account"
            aria-current={isAccountActive ? "page" : undefined}
            className={cn(
              "h-10 px-2 rounded-full flex items-center gap-3 outline-none hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors",
              isAccountActive && "bg-black/[0.04] dark:bg-white/[0.06]"
            )}
          >
            <span className="size-8 shrink-0 rounded-full flex items-center justify-center bg-[#0D5C3A] text-[11px] font-bold text-white shadow-xs">
              {initials}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-[#1F1F1F] dark:text-[#E3E3E3]">
                {userName}
              </span>
              <span className="block truncate text-[11px] font-medium text-[#747775] dark:text-[#8E918F]">
                {rawRoleDisplay}
              </span>
            </span>
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
