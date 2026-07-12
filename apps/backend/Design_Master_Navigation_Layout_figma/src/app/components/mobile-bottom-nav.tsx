import * as React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Users,
  ClipboardEdit,
  Printer,
  Settings,
} from "lucide-react";
import { useIsMobile } from "./ui/use-mobile";
import { cn } from "./ui/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", id: "dashboard" },
  { icon: Users, label: "Students", id: "students" },
  { icon: ClipboardEdit, label: "Marks", id: "marks" },
  { icon: Printer, label: "Reports", id: "reports", badge: 3 },
  { icon: Settings, label: "Settings", id: "settings" },
];

interface MobileBottomNavProps {
  active?: string;
  onNavigate?: (id: string) => void;
}

export function MobileBottomNav({ active = "dashboard", onNavigate }: MobileBottomNavProps) {
  const isMobile = useIsMobile();
  const [localActive, setLocalActive] = React.useState(active);

  if (!isMobile) return null;

  const handleTap = (id: string) => {
    setLocalActive(id);
    onNavigate?.(id);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(0,0,0,0.06)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-stretch h-16">
        {navItems.map((item) => {
          const isActive = localActive === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleTap(item.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative py-2 select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Animated pill background */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute inset-x-1.5 top-1 h-9 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(99,102,241,0.07) 100%)",
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}

              {/* Icon with badge */}
              <div className="relative z-10">
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Icon
                    className={cn(
                      "size-[1.15rem] transition-colors duration-200",
                      isActive ? "text-emerald-500" : "text-slate-400",
                    )}
                    strokeWidth={isActive ? 2.3 : 1.8}
                  />
                </motion.div>
                {item.badge && (
                  <span
                    className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[1rem] h-4 px-0.5 rounded-full bg-orange-500 text-white border-2 border-white"
                    style={{ fontSize: "0.5rem", fontWeight: 700 }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <motion.span
                animate={{ opacity: isActive ? 1 : 0.6 }}
                transition={{ duration: 0.15 }}
                className="relative z-10"
                style={{
                  fontSize: "0.6rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#059669" : "#94a3b8",
                  lineHeight: 1,
                }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
