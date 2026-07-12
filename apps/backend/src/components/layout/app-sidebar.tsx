"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  Printer,
  Settings,
  GraduationCap,
  ChevronRight,
  LogOut,
  ChevronsLeft,
  Sparkles,
  Search,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
} from "../figma-ui/ui/sidebar";
import { cn } from "../figma-ui/ui/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard", href: "/admin" },
  { icon: Users, label: "Students", id: "students", href: "/admin/students" },
  { icon: ClipboardEdit, label: "Marks Entry", id: "marks", href: "/admin/marks" },
  { icon: Printer, label: "Report Center", id: "reports", href: "/admin/reports" },
  { icon: Settings, label: "Settings", id: "settings", href: "/admin/settings" },
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
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={label}
        className={cn(
          "group/nav-item relative h-11 rounded-xl transition-all duration-300",
          "text-slate-400 hover:text-white hover:bg-white/5",
          active && "bg-gradient-to-r from-emerald-500/15 to-orange-500/5 text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]",
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Link href={href}>
        <motion.div
          whileHover={{ scale: 1.15, rotate: [-5, 5, -5, 0] }}
          transition={{ duration: 0.3 }}
          className={cn(
            "relative flex shrink-0 items-center justify-center size-5",
          )}
        >
          <Icon
            className={cn(
              "size-5 transition-colors duration-200",
              active ? "text-emerald-400" : "text-slate-400 group-hover/nav-item:text-slate-200",
            )}
            strokeWidth={1.8}
          />
          {active && (
            <motion.div
              layoutId="nav-active-glow"
              className="absolute inset-0 rounded-full bg-emerald-400/20 blur-sm"
            />
          )}
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "truncate text-sm font-medium",
                active ? "text-emerald-400" : "text-slate-400 group-hover/nav-item:text-slate-200",
              )}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {active && (
          <motion.div
            layoutId="nav-active-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-orange-400 rounded-r-full shadow-[0_0_6px_2px_rgba(52,211,153,0.3)]"
          />
        )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarToggleButton() {
  const { toggleSidebar, state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <motion.button
      onClick={toggleSidebar}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "flex items-center justify-center size-7 rounded-lg",
        "bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/20",
        "text-slate-400 hover:text-white transition-all duration-200",
      )}
      title={collapsed ? "Open sidebar (Ctrl+B)" : "Close sidebar (Ctrl+B)"}
    >
      <motion.div
        animate={{ rotate: collapsed ? 180 : 0 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
      >
        <ChevronsLeft className="size-3.5" strokeWidth={2} />
      </motion.div>
    </motion.button>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 print:hidden"
      style={{ "--sidebar-width": "15rem" } as React.CSSProperties}
    >
      <div
        className="flex flex-col h-full"
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #111827 50%, #0f172a 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <SidebarHeader className="px-3 pt-4 pb-3">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <div
                  className="flex items-center justify-center size-8 rounded-xl"
                  style={{
                    background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                    boxShadow: "0 4px 12px rgba(249,115,22,0.4)",
                  }}
                >
                  <GraduationCap className="size-4 text-white" strokeWidth={2} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-[#0f172a] shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="text-white font-semibold truncate" style={{ fontSize: "0.8rem", lineHeight: 1.2 }}>
                      Jiddah Smart
                    </p>
                    <p className="text-slate-400 truncate" style={{ fontSize: "0.65rem", lineHeight: 1.2 }}>
                      Report Engine
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!collapsed && <SidebarToggleButton />}
          </div>

          {collapsed && (
            <div className="flex justify-center mt-1">
              <SidebarToggleButton />
            </div>
          )}


        </SidebarHeader>

        <SidebarSeparator className="mx-3 mb-1 bg-white/5" />

        {/* Nav items */}
        <SidebarContent className="px-2">
          <SidebarGroup className="p-0 pt-1">
            <AnimatePresence>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 mb-1 text-slate-500 uppercase tracking-widest"
                  style={{ fontSize: "0.6rem" }}
                >
                  Navigation
                </motion.p>
              )}
            </AnimatePresence>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
                  return (
                    <NavItem
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      active={isActive}
                      collapsed={collapsed}
                    />
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* Footer - User profile */}
        <SidebarFooter className="p-3">
          <SidebarSeparator className="mb-2 bg-white/5" />
          
          {/* Utilities Row */}
          <div className={cn("flex items-center mb-2", collapsed ? "flex-col gap-2" : "justify-around px-1")}>
            <button className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Search">
              <Search className="size-4" />
            </button>
            <button className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors relative" title="Notifications">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 bg-red-500 rounded-full" />
            </button>
          </div>

          <div
            className={cn(
              "flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all duration-200 group/profile",
              "hover:bg-white/5",
              collapsed && "justify-center",
            )}
          >
            <div className="relative shrink-0">
              <div
                className="flex items-center justify-center size-8 rounded-lg text-white font-semibold"
                style={{
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  fontSize: "0.75rem",
                  boxShadow: "0 2px 8px rgba(16,185,129,0.4)",
                }}
              >
                AH
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-400 border-2 border-[#0f172a]" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-white truncate" style={{ fontSize: "0.8rem", lineHeight: 1.3 }}>
                    Admin Hassan
                  </p>
                  <p className="text-slate-500 truncate" style={{ fontSize: "0.7rem", lineHeight: 1.3 }}>
                    Head Teacher
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {!collapsed && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 opacity-0 group-hover/profile:opacity-100"
                  title="Logout"
                >
                  <LogOut className="size-3.5" strokeWidth={2} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
