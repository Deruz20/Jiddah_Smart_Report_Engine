"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  Settings,
  LogOut,
  UserCheck,
  BookMarked,
  Library,
  ScrollText,
  BookOpen,
  FileText,
  Shield,
  Upload,
  Bell,
  User,
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
    icon: FileText,
    label: "Report Center",
    teacherLabel: "Report Center",
    id: "reports",
    href: "/admin/reports",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: Bell,
    label: "Notifications",
    id: "notifications",
    href: "/admin/notifications",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology", "Class Teacher"],
  },
  {
    icon: UserCheck,
    label: "Teachers & Staff",
    id: "teachers",
    href: "/admin/teachers",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
  {
    icon: BookMarked,
    label: "Classes",
    id: "classes",
    href: "/admin/classes",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
  {
    icon: Library,
    label: "Subjects",
    id: "subjects",
    href: "/admin/subjects",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
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
    icon: ScrollText,
    label: "Theology Hub",
    id: "theology-hub",
    href: "/admin/theology-hub",
    roles: ["Administrator", "Head Teacher", "DOS Theology"],
    department: "theology",
  },
  {
    icon: Shield,
    label: "Activity Log",
    id: "activity",
    href: "/admin/activity",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
  {
    icon: UserCheck,
    label: "Invites",
    id: "invites",
    href: "/admin/invites",
    roles: ["Administrator", "Head Teacher", "DOS Secular", "DOS Theology"],
  },
  {
    icon: Upload,
    label: "Uploads",
    id: "uploads",
    href: "/admin/upload",
    roles: ["Administrator", "Head Teacher"],
  },
  {
    icon: Settings,
    label: "Settings",
    id: "settings",
    href: "/admin/settings",
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
  const [schoolName, setSchoolName] = React.useState<string>("Jiddah Smart");
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
          setSchoolName(data.school_name || data.name);
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
                  "flex items-center justify-center size-9 rounded-xl overflow-hidden bg-white shadow-xs",
                  sidebarDark ? "ring-1 ring-white/15" : "ring-1 ring-stone-200"
                )}
              >
                <img
                  src="/school_budge.jpeg"
                  alt="School Badge"
                  width="36"
                  height="36"
                  loading="lazy"
                  decoding="async"
                  className="object-contain w-full h-full p-0.5"
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
                      "font-bold tracking-tight truncate max-w-[165px]",
                      sidebarDark ? "text-white" : "text-[#1C1917]"
                    )}
                    style={{ fontSize: "0.86rem", lineHeight: 1.2 }}
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

      {/* Footer - User profile */}
      <SidebarFooter
        className={cn(
          "p-3 pb-4 border-r border-t shadow-none z-20 transition-colors",
          sidebarDark
            ? "bg-[#0B1120] border-[#1E293B] border-t-[#1E293B]"
            : "bg-[#FAF7F2] border-[#E7E2D7] border-t-[#E7E2D7]/70"
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              data-testid="sidebar-profile-trigger"
              aria-label="User profile menu"
              className={cn(
                "w-full min-h-[44px] text-left flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors duration-200 bg-transparent border-0",
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
                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 border-2",
                    sidebarDark ? "border-[#0B1120]" : "border-[#FAF7F2]"
                  )}
                />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex-1 min-w-0 text-left overflow-hidden whitespace-nowrap"
                  >
                    <p
                      className={cn(
                        "font-bold truncate",
                        sidebarDark ? "text-white" : "text-[#1C1917]"
                      )}
                      style={{ fontSize: "0.82rem", lineHeight: 1.3 }}
                    >
                      {userName}
                    </p>
                    <p
                      className="font-semibold truncate"
                      style={{
                        fontSize: "0.7rem",
                        lineHeight: 1.3,
                        color: sidebarDark ? "#34D399" : accentColor,
                      }}
                    >
                      {rawRoleDisplay || canonicalRole}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="center"
            sideOffset={12}
            className="w-56 bg-[#FAF7F2] border-[#E7E2D7] text-[#1C1917] z-[100] shadow-xl"
          >
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-bold text-[#1C1917]">{userName}</p>
                <p className="text-xs text-[#78716C]">{rawRoleDisplay || canonicalRole}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#E7E2D7]" />
            <DropdownMenuItem asChild>
              <Link href="/admin/notifications" className="min-h-[40px] cursor-pointer focus:bg-stone-200/70 py-2">
                <User className="mr-2 h-4 w-4 text-stone-500" />
                <span>My Profile &amp; Alerts</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.updateUser({ data: { tour_completed: false } });
                window.location.reload();
              }}
              className="min-h-[40px] cursor-pointer focus:bg-stone-200/70 py-2"
            >
              <BookOpen className="mr-2 h-4 w-4 text-stone-500" />
              <span>Replay Product Tour</span>
            </DropdownMenuItem>
            {!isTeacherOnly && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="min-h-[40px] cursor-pointer focus:bg-stone-200/70 py-2">
                  <Settings className="mr-2 h-4 w-4 text-stone-500" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-[#E7E2D7]" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="min-h-[40px] text-rose-700 focus:text-rose-800 focus:bg-rose-50 cursor-pointer py-2"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
