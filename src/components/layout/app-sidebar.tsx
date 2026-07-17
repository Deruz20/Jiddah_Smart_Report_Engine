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
  GraduationCap,
  ChevronRight,
  LogOut,
  ChevronsLeft,
  Search,
  UserCheck,
  BookMarked,
  Library,
  ScrollText,
  BookOpen,
  FileText,
  Shield,
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
  SidebarSeparator,
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
  TooltipProvider,
  TooltipTrigger,
} from "../figma-ui/ui/tooltip";
import { cn } from "../figma-ui/ui/utils";
import { createClient } from "@/utils/supabase/client";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", href: "/admin", roles: ["admin", "Admin", "Secular DOS", "Theology DOS", "teacher", "Class Teacher", "Theology Instructor"] },
  { icon: Users, label: "Students", id: "students", href: "/admin/students", roles: ["admin", "Admin", "Secular DOS", "Theology DOS", "teacher", "Class Teacher", "Theology Instructor"] },
  { icon: UserCheck, label: "Teachers & Staff", id: "teachers", href: "/admin/teachers", roles: ["admin", "Admin", "Secular DOS", "Theology DOS"] },
  { icon: BookMarked, label: "Classes", id: "classes", href: "/admin/classes", roles: ["admin", "Admin", "Secular DOS", "Theology DOS"] },
  { icon: Library, label: "Subjects", id: "subjects", href: "/admin/subjects", roles: ["admin", "Admin", "Secular DOS", "Theology DOS"] },

  { icon: ClipboardEdit, label: "Marks Entry", id: "marks", href: "/admin/marks", roles: ["admin", "Admin", "DOS Secular", "DOS Theology", "Secular DOS", "Theology DOS", "teacher", "Class Teacher", "Theology Instructor"] },
  { icon: FileText, label: "Report Center", id: "reports", href: "/admin/reports", roles: ["admin", "Admin", "DOS Secular", "DOS Theology", "Secular DOS", "Theology DOS", "teacher", "Class Teacher", "Theology Instructor"] },
  { icon: ScrollText, label: "Theology Hub", id: "theology-hub", href: "/admin/theology-hub", roles: ["admin", "Admin", "DOS Theology", "Theology DOS", "Theology Instructor"] },
  { icon: Settings, label: "Settings", id: "settings", href: "/admin/settings", roles: ["admin", "Admin", "DOS Secular", "DOS Theology", "Secular DOS", "Theology DOS", "teacher", "Class Teacher", "Theology Instructor"] },
];

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  collapsed: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <Link 
              href={href} 
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
              className={cn(
                "group/nav-item relative flex items-center h-[2.6rem] w-full rounded-xl transition-all duration-200 outline-none border-none",
                collapsed ? "justify-center" : "px-3",
                active 
                  ? "bg-emerald-500/15 text-emerald-400 font-medium shadow-sm" 
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )}
            >
              {active && !collapsed && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-[3px] bg-emerald-400 rounded-r-full shadow-[1px_0_8px_rgba(52,211,153,0.4)]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className={cn("flex items-center justify-center size-8 shrink-0 rounded-lg", collapsed && !active && "group-hover/nav-item:scale-110 transition-transform")}>
                <Icon
                  className={cn(
                    "size-[1.1rem] transition-all duration-200",
                    active ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]" : "text-slate-400 group-hover/nav-item:text-slate-200"
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
              </div>

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "truncate text-sm ml-2 overflow-hidden",
                      active ? "text-emerald-400" : "text-slate-300 group-hover/nav-item:text-white"
                    )}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" sideOffset={14} className="bg-slate-800 border-slate-700 text-slate-100 text-xs shadow-xl font-medium z-[100]">
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
  const [role, setRole] = React.useState<string>("admin");
  const [userName, setUserName] = React.useState<string>("");
  
  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user?.user_metadata) {
        setRole(user.user_metadata.role || 'teacher');
        setUserName(user.user_metadata.full_name || user.email?.split('@')[0] || 'User');
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 print:hidden z-40"
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <div className="flex flex-col h-full bg-[#0a0f1c] border-r border-slate-800/60 shadow-2xl">
        {/* Header */}
        <SidebarHeader className="px-4 pt-5 pb-4">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <div 
              className={cn("flex items-center gap-3 min-w-0 cursor-pointer group/logo", collapsed && "flex-col")}
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <div className="relative shrink-0 transition-transform duration-300 group-hover/logo:scale-105">
                <div
                  className="flex items-center justify-center size-[34px] rounded-xl overflow-hidden bg-white ring-1 ring-white/10"
                  style={{
                    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  }}
                >
                  <img src="/images/jiddah_islamic_school.jpg" alt="Logo" width="34" height="34" className="object-cover w-full h-full" />
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
                    <p className="text-white font-bold tracking-wide" style={{ fontSize: "0.85rem", lineHeight: 1.2 }}>
                      Jiddah Smart
                    </p>
                    <p className="text-slate-400 font-medium" style={{ fontSize: "0.68rem", lineHeight: 1.2 }}>
                      Report Engine
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </SidebarHeader>

        {/* Nav items */}
        <SidebarContent className="px-3 pt-2 overflow-x-hidden">
          <SidebarGroup className="p-0">
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.filter(item => item.roles.includes(role)).map((item) => {
                  const active = item.href === '/admin' 
                    ? pathname === '/admin' 
                    : (pathname === item.href || pathname.startsWith(`${item.href}/`));
                  return (
                    <NavItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      active={active}
                      collapsed={collapsed}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer - User profile */}
        <SidebarFooter className="p-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors duration-200 hover:bg-white/5",
                  collapsed && "justify-center",
                )}
              >
                <div className="relative shrink-0">
                  <div
                    className="flex items-center justify-center size-9 rounded-xl text-emerald-950 font-bold tracking-wider"
                    style={{
                      background: "linear-gradient(135deg, #34d399 0%, #059669 100%)",
                      fontSize: "0.75rem",
                      boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
                    }}
                  >
                    {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || userName.slice(0,2).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-400 border-[2.5px] border-[#0a0f1c]" />
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
                      <p className="text-slate-100 font-medium truncate" style={{ fontSize: "0.82rem", lineHeight: 1.3 }}>
                        {userName}
                      </p>
                      <p className="text-emerald-500/80 font-medium truncate" style={{ fontSize: "0.7rem", lineHeight: 1.3 }}>
                        {role}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={12}
              className="w-56 bg-slate-900 border-slate-800 text-slate-200 z-[100] shadow-2xl"
            >
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-white">{userName}</p>
                  <p className="text-xs text-slate-400">{role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={async () => {
                const supabase = createClient();
                await supabase.auth.updateUser({ data: { tour_completed: false } });
                window.location.reload();
              }} className="cursor-pointer focus:bg-slate-800 focus:text-white py-2">
                <BookOpen className="mr-2 h-4 w-4 text-slate-400" />
                <span>Replay Product Tour</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/settings" className="cursor-pointer focus:bg-slate-800 focus:text-white py-2">
                  <Settings className="mr-2 h-4 w-4 text-slate-400" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 focus:bg-red-950/50 cursor-pointer py-2">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
