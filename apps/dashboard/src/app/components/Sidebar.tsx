import { NavLink, useLocation } from "react-router";
import { useAuthContext } from "@/contexts/AuthProvider";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, FileText,
  BarChart3, Upload, Settings, Shield, Bell, Activity,
  ChevronLeft, ChevronRight, BookMarked, Star, X,
  GraduationCap, ScrollText, ClipboardList, Search, Sun, Moon
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Teachers & Staff", path: "/teachers", icon: UserCheck },
  { label: "Classes", path: "/classes", icon: BookMarked },
  { label: "Subjects", path: "/subjects", icon: BookOpen },
  { label: "Circular Hub", path: "/circular", icon: GraduationCap },
  { label: "Theology Hub", path: "/theology", icon: ScrollText },
  { label: "Marks Entry", path: "/marks", icon: ClipboardList },
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
}

export function Sidebar({ desktopCollapsed, onDesktopToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuthContext();
  const displayName = user?.name ?? user?.email ?? "Admin";
  const initials = displayName.slice(0, 2).toUpperCase();

  const sidebarClasses = `
    fixed top-0 left-0 h-full z-50 hidden lg:flex flex-col
    bg-[#123524]
    transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]
    border-r border-[#1F7A4D] shadow-sm
    ${desktopCollapsed ? "lg:w-16" : "lg:w-64"}
  `;

  return (
    <>
      <aside className={sidebarClasses}>
        {/* Header / Logo */}
        <div className="flex items-center justify-between px-5 h-[72px] shrink-0 border-b border-[#1F7A4D]">
          <div className={`flex items-center gap-3 overflow-hidden ${desktopCollapsed ? "lg:justify-center w-full" : ""}`}>
            <img
              src="/school_budge.jpeg"
              alt="Logo"
              className="w-10 h-10 rounded-xl object-cover shrink-0 mix-blend-multiply bg-white"
            />
            <div className={`flex flex-col transition-opacity duration-300 whitespace-nowrap ${desktopCollapsed ? "lg:opacity-0 lg:w-0 lg:hidden" : "opacity-100"}`}>
              <h1 className="text-white font-bold text-[14px] leading-tight tracking-tight">Jiddah Islamic</h1>
              <p className="text-[#6B7B73] text-[11px] font-medium tracking-wide uppercase mt-0.5">Report Engine</p>
            </div>
          </div>
        </div>

        {/* Global Search Icon (CMD+K) */}
        <div className="px-3 py-3 border-b border-[#1F7A4D]/50 flex justify-center">
          <button 
            className={`flex items-center w-full rounded-xl hover:bg-[#1F7A4D]/30 transition-all text-[#6B7B73] hover:text-white ${desktopCollapsed ? "justify-center p-2.5" : "px-3 py-2.5 gap-3"}`}
            title="Search (CMD+K)"
          >
            <Search className="w-5 h-5 shrink-0" />
            {!desktopCollapsed && (
              <span className="text-[13px] font-medium flex-1 text-left flex justify-between items-center">
                <span>Search</span>
                <span className="text-[10px] bg-[#1F7A4D]/50 px-1.5 py-0.5 rounded text-white/70">âŒ˜K</span>
              </span>
            )}
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 scrollbar-thin scrollbar-thumb-[#1F7A4D] scrollbar-track-transparent">
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
                        ? "bg-[#1F7A4D] text-white" 
                        : "text-[#6B7B73] hover:bg-[#1F7A4D]/50 hover:text-white"
                      }
                      ${desktopCollapsed ? "lg:justify-center" : ""}
                    `}
                  >
                    {/* Active Line Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#C9A227] rounded-r-full" />
                    )}
                    
                    <Icon className={`w-[22px] h-[22px] shrink-0 transition-colors duration-200 ${isActive ? "text-white" : "group-hover:text-white"}`} strokeWidth={isActive ? 2.5 : 2} />
                    
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
        <div className="p-4 shrink-0 border-t border-[#1F7A4D] bg-[#123524]">
          <div className={`flex items-center gap-3 mb-4 overflow-hidden ${desktopCollapsed ? "lg:justify-center" : ""}`}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1F7A4D] shrink-0 shadow-sm border border-[#C9A227]">
              <span className="text-[#C9A227] text-sm font-bold tracking-wider">{initials}</span>
            </div>
            <div className={`flex flex-col whitespace-nowrap transition-all duration-300 ${desktopCollapsed ? "lg:opacity-0 lg:w-0" : "opacity-100"}`}>
              <p className="text-white text-sm font-semibold truncate max-w-[160px]">{displayName}</p>
              <p className="text-[#6B7B73] text-[11px] font-medium uppercase tracking-wider">{user?.role ?? "Staff"}</p>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 mb-3 ${desktopCollapsed ? "flex-col" : "justify-between px-1"}`}>
            <button className="p-2 rounded-lg text-[#6B7B73] hover:text-white hover:bg-[#1F7A4D]/50 transition-colors relative" title="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <button className="p-2 rounded-lg text-[#6B7B73] hover:text-white hover:bg-[#1F7A4D]/50 transition-colors" title="Toggle Theme">
              <Sun className="w-[18px] h-[18px]" />
            </button>
          </div>
          
          <button
            onClick={onDesktopToggle}
            className="hidden lg:flex w-full items-center justify-center gap-2 py-2.5 rounded-xl text-[#6B7B73] hover:text-white hover:bg-[#1F7A4D] transition-all duration-200 group"
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

