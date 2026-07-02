import { NavLink, useLocation } from "react-router";
import { useAuthContext } from "@/contexts/AuthProvider";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, FileText,
  BarChart3, Upload, Settings, Shield, Bell, Activity,
  ChevronLeft, ChevronRight, BookMarked, Star,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Teachers & Staff", path: "/teachers", icon: UserCheck },
  { label: "Classes", path: "/classes", icon: BookMarked },
  { label: "Marks Entry", path: "/marks", icon: BookOpen },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Signatures & Stamps", path: "/signatures", icon: Star },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Upload Center", path: "/upload", icon: Upload },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Account & Security", path: "/account", icon: Shield },
  { label: "Activity Logs", path: "/activity", icon: Activity },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthContext();
  const displayName = user?.name ?? user?.email ?? "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <aside
      className={`fixed left-0 top-0 h-full z-40 flex flex-col transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-64"
      }`}
      style={{ background: "linear-gradient(180deg, #065F46 0%, #064E3B 60%, #022C22 100%)" }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        <img
          src="/school_budge.jpeg"
          alt="Jiddah Islamic School"
          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
          style={{ border: "1px solid rgba(245,158,11,0.4)" }}
        />
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold leading-tight" style={{ fontSize: "13px" }}>Jiddah Islamic</p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>Smart Report Engine</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all duration-150 group ${
                isActive
                  ? "text-white"
                  : "text-white/60 hover:text-white hover:bg-white/8"
              } ${collapsed ? "justify-center" : ""}`}
              style={isActive ? { background: "rgba(16,185,129,0.25)", borderLeft: "3px solid #10B981" } : {}}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-white/60 group-hover:text-white"}`} />
              {!collapsed && (
                <span style={{ fontSize: "13.5px", fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10B981, #065F46)" }}>
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-white text-xs font-medium truncate">{displayName}</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{user?.role ?? "Staff"}</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-white/50 hover:text-white hover:bg-white/8 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span style={{ fontSize: "12px" }}>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
