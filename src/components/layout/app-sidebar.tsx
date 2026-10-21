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
  Settings,
  Shield,
  LogOut,
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../figma-ui/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../figma-ui/ui/tooltip";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";
import {
  normalizeAccountRole,
  resolveRoleDepartment,
  type CanonicalAccountRole,
} from "@/lib/teacher-access";
import {
  fetchSchoolSettingsCached,
  getStoredThemeMode,
  invalidateClientCache,
  resolveEffectiveTheme,
} from "@/lib/client-cache";

export interface NavItemConfig {
  icon: React.ElementType;
  label: string;
  teacherLabel?: string;
  id: string;
  href: string;
  roles: CanonicalAccountRole[];
  department?: "secular" | "theology";
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
    icon: UserCheck,
    label: "Teachers & Staff",
    id: "teachers",
    href: "/admin/teachers",
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
  icon: Icon,
  label,
  href,
  id,
  active,
  collapsed,
  accentColor,
  sidebarDark,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  id: string;
  active?: boolean;
  collapsed: boolean;
  accentColor: string;
  sidebarDark: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const isActive = active || (id === "dashboard" && pathname === "/admin");

  const activeTextColor = sidebarDark ? "#34D399" : accentColor;
  const activeBgColor = sidebarDark ? "rgba(16, 185, 129, 0.14)" : `${accentColor}14`;
  const activeBorderColor = sidebarDark ? "rgba(16, 185, 129, 0.32)" : `${accentColor}38`;
  const activeBarColor = sidebarDark ? "#10B981" : accentColor;

  return (
    <SidebarMenuItem>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Link
            href={href}
            data-testid={`nav-item-${id}`}
            onClick={() => isMobile && setOpenMobile(false)}
            className={cn(
              "group/nav-item relative flex items-center min-h-[44px] h-11 w-full rounded-xl outline-none border-none transition-colors duration-150",
              collapsed ? "justify-center" : "px-3",
              !isActive &&
                (sidebarDark
                  ? "text-[#94A3B8] hover:text-white hover:bg-[#1E293B]/75"
                  : "text-[#57534E] hover:text-[#1C1917] hover:bg-[#F3EFE6]")
            )}
          >
            {isActive && (
              <motion.div
                layoutId="active-nav-background"
                className="absolute inset-0 rounded-xl z-0"
                style={{
                  backgroundColor: activeBgColor,
                  border: `1px solid ${activeBorderColor}`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                  mass: 0.8,
                }}
              />
            )}

            {isActive && !collapsed && (
              <motion.div
                layoutId="active-nav-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-[3.5px] rounded-r-full z-10"
                style={{ backgroundColor: activeBarColor }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center size-8 shrink-0 rounded-lg">
              <Icon
                className={cn(
                  "size-[1.15rem] transition-all duration-200",
                  !isActive &&
                    (sidebarDark
                      ? "text-[#94A3B8] group-hover/nav-item:text-white"
                      : "text-[#78716C] group-hover/nav-item:text-[#1C1917]")
                )}
                style={isActive ? { color: activeTextColor } : undefined}
                strokeWidth={isActive ? 2.2 : 1.8}
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
                    "relative z-10 text-sm ml-3 overflow-hidden whitespace-nowrap",
                    isActive
                      ? "font-bold"
                      : sidebarDark
                      ? "text-[#94A3B8] group-hover/nav-item:text-white font-medium"
                      : "text-[#57534E] font-medium"
                  )}
                  style={isActive ? { color: activeTextColor } : undefined}
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </TooltipTrigger>

        {collapsed && (
          <TooltipContent
            side="right"
            sideOffset={18}
            className="bg-stone-900 border-stone-800 text-stone-100 text-xs shadow-xl font-medium z-[100] px-3 py-1.5 rounded-lg"
          >
            {label}
          </TooltipContent>
        )}
      </Tooltip>
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
  const [accentColor, setAccentColor] = React.useState<string>("#059669");
  const [schoolName, setSchoolName] = React.useState<string>("JIDDAH ISLAMIC SCHOOLS");
  const [sidebarDark, setSidebarDark] = React.useState<boolean>(true);

  React.useEffect(() => {
    const syncTheme = () => {
      const mode = getStoredThemeMode();
      const resolved = resolveEffectiveTheme(mode);
      setSidebarDark(resolved.sidebarDark);
    };
    syncTheme();
    window.addEventListener("jiddah-theme-changed", syncTheme);
    return () => window.removeEventListener("jiddah-theme-changed", syncTheme);
  }, []);

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
      }
    });

    let active = true;
    fetchSchoolSettingsCached()
      .then((data) => {
        if (!active || !data) return;
        if (data.theme_color) {
          setAccentColor(data.theme_color);
        }
        if (data.school_name || data.name) {
          const raw = data.school_name || data.name;
          setSchoolName(raw && !raw.toLowerCase().includes('nursery and primary') ? String(raw).toUpperCase() : 'JIDDAH ISLAMIC SCHOOLS');
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    invalidateClientCache();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const visibleItems = getVisibleNavItemsForRole(rawRoleDisplay || canonicalRole, rawSubject);
  const isTeacherOnly = canonicalRole === "Class Teacher";

  const sidebarBg = sidebarDark ? "#0B1120" : "#FAF7F2";
  const sidebarBorder = sidebarDark ? "#1E293B" : "#E7E2D7";

  return (
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
      {/* Header */}
      <SidebarHeader
        className={cn(
          "px-4 pt-4 pb-3 border-r shadow-none z-20 transition-colors",
          sidebarDark
            ? "bg-[#0B1120] border-[#1E293B]"
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
            <div className="relative shrink-0">
              <div
                className={cn(
                  "flex items-center justify-center size-9 rounded-xl overflow-hidden bg-transparent shadow-xs",
                  sidebarDark ? "ring-1 ring-white/10" : "ring-1 ring-stone-200"
                )}
              >
                <img
                  src="/school_logo.svg"
                  alt="School Badge"
                  width="36"
                  height="36"
                  loading="lazy"
                  decoding="async"
                  className="object-contain w-full h-full"
                />
              </div>
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
      </SidebarHeader>

      {/* Nav items */}
      <SidebarContent
        className={cn(
          "px-3 pt-2 overflow-x-hidden border-r shadow-none z-10 relative transition-colors",
          sidebarDark
            ? "bg-[#0B1120] border-[#1E293B]"
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
                const displayLabel = isTeacherOnly && item.teacherLabel ? item.teacherLabel : item.label;
                return (
                  <NavItem
                    key={item.id}
                    id={item.id}
                    icon={item.icon}
                    label={displayLabel}
                    href={item.href}
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

      {/* Footer - User profile with Gemini-style Settings Gear */}
      <SidebarFooter
        className={cn(
          "p-2.5 pb-3 border-r border-t shadow-none z-20 transition-colors",
          sidebarDark
            ? "bg-[#0B1120] border-[#1E293B] border-t-[#1E293B]"
            : "bg-[#FAF7F2] border-[#E7E2D7] border-t-[#E7E2D7]/70"
        )}
      >
        <div className="flex items-center gap-1.5 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-testid="sidebar-profile-trigger"
                aria-label="User profile menu"
                className={cn(
                  "flex-1 min-w-0 min-h-[44px] text-left flex items-center gap-2.5 p-1.5 rounded-xl cursor-pointer transition-colors duration-200 bg-transparent border-0",
                  sidebarDark ? "hover:bg-[#1E293B]" : "hover:bg-[#F3EFE6]",
                  collapsed && "justify-center"
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className="flex items-center justify-center size-9 rounded-xl text-white font-bold tracking-wider"
                    style={{
                      backgroundColor: sidebarDark ? "#059669" : accentColor,
                      fontSize: "0.75rem",
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
                      "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2",
                      sidebarDark ? "border-[#0B1120]" : "border-[#FAF7F2]"
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
                    <p
                      className="font-medium truncate text-[11px] text-emerald-400"
                    >
                      {rawRoleDisplay || canonicalRole}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side={collapsed ? "right" : "top"}
              align="end"
              className={cn(
                "w-56 p-1.5 rounded-xl shadow-2xl border font-sans z-[100]",
                sidebarDark
                  ? "bg-[#0F172A] border-[#1E293B] text-white"
                  : "bg-white border-[#E7E2D7] text-[#1C1917]"
              )}
            >
              <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-bold text-stone-400 uppercase tracking-wider">
                My Account
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/settings"
                  className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-emerald-500" />
                  School Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/activity"
                  className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-amber-500" />
                  Activity Log
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className={sidebarDark ? "bg-[#1E293B]" : "bg-[#E7E2D7]"} />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Settings Gear Icon (Gemini Style) */}
          {!collapsed && (
            <Link
              href="/admin/settings"
              title="Settings"
              aria-label="Settings"
              className={cn(
                "size-8 rounded-lg flex items-center justify-center shrink-0 transition-all cursor-pointer",
                sidebarDark
                  ? "text-stone-400 hover:text-white hover:bg-white/10"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/60"
              )}
            >
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
