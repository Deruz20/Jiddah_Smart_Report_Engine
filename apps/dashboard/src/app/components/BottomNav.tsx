import { NavLink } from "react-router";
import { LayoutDashboard, Users, BookOpen, FileText, Settings } from "lucide-react";

const mobileNavItems = [
  { label: "Dash", path: "/dashboard", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: Users },
  { label: "Circular", path: "/circular", icon: BookOpen },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Settings", path: "/settings", icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#123524] border-t border-[#1F7A4D] lg:hidden pb-[env(safe-area-inset-bottom)]">
      <ul className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              className={({ isActive }) => `
                flex flex-col items-center justify-center h-full space-y-1 transition-colors
                ${isActive ? "text-[#C9A227]" : "text-[#6B7B73] hover:text-white"}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
