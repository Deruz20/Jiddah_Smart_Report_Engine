"use client";

import * as React from "react";
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
import { JiddahLogo } from "@/components/brand/JiddahLogo";
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
  {
    icon: Settings,
    label: "School Settings",
    id: "settings",
    href: "/admin/settings",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
];

/** Section headings — each nav item belongs to exactly one section, ordered by task frequency. */
const NAV_SECTIONS: { label: string; ids: string[] }[] = [
  { label: "Daily work", ids: ["dashboard", "marks", "roll-call", "students", "classes", "subjects"] },
  { label: "Reporting", ids: ["reports", "secular-hub", "theology-hub"] },
  { label: "Administration", ids: ["teachers", "uploads", "settings"] },
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

/* ─── Nav item ──────────────────────────────────────────────────────────── */

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
  // The overview child duplicates the parent link, so only genuinely distinct children are listed.
  const subItems = (item.children ?? []).filter((c) => c.href !== item.href);
  const hasSub = subItems.length > 0;
  const subActive = subItems.some((c) => isRouteActive(pathname, c.href));
  const [open, setOpen] = React.useState(active || subActive);

  React.useEffect(() => {
    if (active || subActive) setOpen(true);
  }, [active, subActive]);

  const link = (
    <Link
      href={item.href}
      data-testid={`nav-item-${item.id}`}
      aria-current={active ? "page" : undefined}
      onClick={() => isMobile && setOpenMobile(false)}
      className={cn(
        "group/nav relative flex items-center rounded-lg outline-none transition-colors duration-150",
        "focus-visible:ring-2 focus-visible:ring-[var(--sb-active-bar)]",
        collapsed ? "size-10 mx-auto justify-center" : "h-9 w-full gap-3 pl-3 pr-2",
        active
          ? "bg-[var(--sb-active-bg)] text-[var(--sb-active-text)] font-semibold"
          : "text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text-strong)] font-medium"
      )}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sb-active-bar)]"
        />
      )}
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {!collapsed && <span className="flex-1 truncate text-[13px] leading-none">{item.label}</span>}
      {!collapsed && hasSub && (
        <button
          type="button"
          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={open}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="grid size-6 place-items-center rounded-md text-[var(--sb-muted)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text-strong)]"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform duration-150", open && "rotate-90")}
            strokeWidth={1.75}
          />
        </button>
      )}
    </Link>
  );

  return (
    <SidebarMenuItem className="flex flex-col">
      {collapsed ? (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      ) : (
        link
      )}

      {hasSub && !collapsed && open && (
        <div className="ml-[1.35rem] mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-[var(--sb-border)] pl-3">
          {subItems.map((child) => {
            const childActive = isRouteActive(pathname, child.href);
            return (
              <Link
                key={child.id}
                href={child.href}
                aria-current={childActive ? "page" : undefined}
                onClick={() => isMobile && setOpenMobile(false)}
                className={cn(
                  "flex h-8 items-center rounded-md px-2 text-[12.5px] transition-colors",
                  childActive
                    ? "bg-[var(--sb-active-bg)] font-semibold text-[var(--sb-active-text)]"
                    : "font-medium text-[var(--sb-text)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text-strong)]"
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

/* ─── Sidebar ───────────────────────────────────────────────────────────── */

export function AppSidebar() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed" && !isMobile;

  const [canonicalRole, setCanonicalRole] = React.useState<CanonicalAccountRole>("Administrator");
  const [rawRoleDisplay, setRawRoleDisplay] = React.useState("Administrator");
  const [rawSubject, setRawSubject] = React.useState("");
  const [userName, setUserName] = React.useState("Staff");
  const [schoolName, setSchoolName] = React.useState("Jiddah Islamic Schools");

  // Keep the sidebar palette attribute in sync with the stored theme mode.
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
      let displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Staff";

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

  const sections = NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: section.ids
      .map((id) => visible.find((v) => v.id === id))
      .filter((v): v is NavItemConfig => Boolean(v)),
  })).filter((s) => s.items.length > 0);

  return (
    <Sidebar
      collapsible="icon"
      className="print:hidden z-40"
      style={
        {
          "--sidebar-width": "15rem",
          "--sidebar-width-icon": "4rem",
        } as React.CSSProperties
      }
    >
      {/* Brand */}
      <SidebarHeader className="h-14 shrink-0 justify-center border-b border-[var(--sb-border)] bg-[var(--sb-bg)] px-3 py-0">
        <Link
          href="/admin"
          aria-label={`${schoolName} — dashboard`}
          className={cn(
            "flex min-w-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-active-bar)]",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          {/* Solid light tile so the green shield stays legible on any sidebar theme */}
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl shadow-sm ring-1"
            style={{ background: "var(--sb-logo-tile)", ["--tw-ring-color" as string]: "var(--sb-logo-ring)" }}
          >
            <JiddahLogo height={30} className="w-auto" />
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-bold text-[var(--sb-text-strong)]">{schoolName}</span>
              <span className="block truncate text-[11px] font-medium text-[var(--sb-muted)]">Smart Report Engine</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="gap-0 overflow-x-hidden bg-[var(--sb-bg)] px-3 py-3">
        <nav aria-label="Primary" className="flex flex-col gap-4">
          {sections.map((section, index) => (
            <div key={section.label} className="flex flex-col gap-1">
              {collapsed ? (
                index > 0 && <div aria-hidden className="mx-auto mb-1 h-px w-6 bg-[var(--sb-border)]" />
              ) : (
                <p className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[var(--sb-muted)]">
                  {section.label}
                </p>
              )}
              <SidebarMenu className="gap-0.5">
                {section.items.map((item) => (
                  <NavItem
                    key={item.id}
                    item={{ ...item, label: isTeacherOnly && item.teacherLabel ? item.teacherLabel : item.label }}
                    active={isRouteActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </SidebarMenu>
            </div>
          ))}
        </nav>
      </SidebarContent>

      {/* Account + collapse — no popover; account actions live in the topbar menu */}
      <SidebarFooter className="shrink-0 gap-1 border-t border-[var(--sb-border)] bg-[var(--sb-bg)] p-3">
        {collapsed ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Link
                href="/admin/account"
                aria-label={`${userName} — account`}
                className="mx-auto grid size-10 place-items-center rounded-lg outline-none hover:bg-[var(--sb-hover)] focus-visible:ring-2 focus-visible:ring-[var(--sb-active-bar)]"
              >
                <span className="grid size-8 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                  {initials}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={12} className="text-xs font-medium">
              {userName} · {rawRoleDisplay}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/admin/account"
            className="flex h-12 items-center gap-3 rounded-lg px-2 outline-none hover:bg-[var(--sb-hover)] focus-visible:ring-2 focus-visible:ring-[var(--sb-active-bar)]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              {initials}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-semibold text-[var(--sb-text-strong)]">{userName}</span>
              <span className="block truncate text-[11px] font-medium text-[var(--sb-muted)]">{rawRoleDisplay}</span>
            </span>
          </Link>
        )}

        {!isMobile && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
            className={cn(
              "flex items-center rounded-lg text-[12.5px] font-medium text-[var(--sb-muted)] outline-none transition-colors",
              "hover:bg-[var(--sb-hover)] hover:text-[var(--sb-text-strong)] focus-visible:ring-2 focus-visible:ring-[var(--sb-active-bar)]",
              collapsed ? "mx-auto size-10 justify-center" : "h-9 gap-3 px-3"
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" strokeWidth={1.75} />
            ) : (
              <>
                <PanelLeftClose className="size-4" strokeWidth={1.75} />
                <span>Collapse</span>
              </>
            )}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
