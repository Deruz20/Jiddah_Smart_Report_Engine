import { NavLink, useLocation } from "react-router";
import { useAuthContext } from "@/contexts/AuthProvider";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, FileText,
  BarChart3, Upload, Settings, Shield, Bell, Activity,
  ChevronLeft, ChevronRight, BookMarked, Star, X
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Teachers & Staff", path: "/teachers", icon: UserCheck },
  { label: "Classes", path: "/classes", icon: BookMarked },
  { label: "Marks Entry", path: "/marks", icon: BookOpen },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Signatures", path: "/signatures", icon: Star },
  { label: "Analytics", path: "/analytics", icon: BarChart3 },
  { label: "Upload Center", path: "/upload", icon: Upload },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Terms", path: "/terms", icon: BookOpen },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Account & Security", path: "/account", icon: Shield },
  { label: "Activity Logs", path: "/activity", icon: Activity },
];

interface SidebarProps {
  desktopCollapsed: boolean;
  onDesktopToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ desktopCollapsed, onDesktopToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthContext();
  const displayName = user?.name ?? user?.email ?? "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  // On mobile, the sidebar is either open (w-72) or closed (translate-x-full).
  // On desktop, it's either collapsed (w-20) or expanded (w-[280px]).
  const sidebarClasses = `
    fixed top-0 left-0 h-full z-50 flex flex-col
    bg-white
    transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
    border-r border-slate-200 shadow-sm
    ${mobileOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"}
    ${desktopCollapsed ? "lg:w-[80px]" : "lg:w-[280px]"}
  `;

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      <aside className={sidebarClasses}>
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-5 h-[72px] shrink-0 border-b border-slate-100">
          <div className={`flex items-center gap-3 overflow-hidden ${desktopCollapsed ? "lg:justify-center w-full" : ""}`}>
            <img
              src="/school_budge.jpeg"
              alt="Logo"
              className="w-10 h-10 rounded-xl object-cover shrink-0 mix-blend-multiply"
            />
            <div className={`flex flex-col transition-opacity duration-300 whitespace-nowrap ${desktopCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100"}`}>
              <h1 className="text-[#065F46] font-bold text-[14px] leading-tight tracking-tight">Jiddah Islamic</h1>
              <p className="text-slate-500 text-[11px] font-medium tracking-wide uppercase mt-0.5">Report Engine</p>
            </div>
          </div>
          
          {/* Mobile Close Button */}
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            onClick={onMobileClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <ul className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              const Icon = item.icon;
              
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    title={desktopCollapsed ? item.label : undefined}
                    className={`
                      relative flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-200 group overflow-hidden
                      ${isActive 
                        ? "bg-[#065F46]/10 text-[#065F46]" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-[#065F46]"
                      }
                      ${desktopCollapsed ? "lg:justify-center" : ""}
                    `}
                  >
                    {/* Active Line Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#F97316] rounded-r-full" />
                    )}
                    
                    <Icon className={`w-[22px] h-[22px] shrink-0 transition-colors duration-200 ${isActive ? "text-[#065F46]" : "group-hover:text-[#065F46]"}`} strokeWidth={isActive ? 2.5 : 2} />
                    
                    <span className={`
                      text-[14px] whitespace-nowrap transition-all duration-300
                      ${isActive ? "font-semibold tracking-wide" : "font-medium"}
                      ${desktopCollapsed ? "lg:opacity-0 lg:w-0 lg:translate-x-4" : "opacity-100 translate-x-0"}
                    `}>
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer Profile & Toggle */}
        <div className="p-4 shrink-0 border-t border-slate-100 bg-slate-50">
          <div className={`flex items-center gap-3 mb-4 overflow-hidden ${desktopCollapsed ? "lg:justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-[#065F46] to-[#047857] shrink-0 shadow-sm">
              <span className="text-white text-sm font-bold tracking-wider">{initials}</span>
            </div>
            <div className={`flex flex-col whitespace-nowrap transition-all duration-300 ${desktopCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100"}`}>
              <p className="text-slate-800 text-sm font-semibold truncate max-w-[160px]">{displayName}</p>
              <p className="text-slate-500 text-[11px] font-medium uppercase tracking-wider">{user?.role ?? "Staff"}</p>
            </div>
          </div>
          
          <button
            onClick={onDesktopToggle}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-all duration-200 group"
          >
            {desktopCollapsed ? (
              <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-xs font-semibold uppercase tracking-widest">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
