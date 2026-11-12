"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardEdit,
  Users,
  FileText,
  MoreHorizontal,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "../figma-ui/ui/utils";
import {
  getVisibleNavItemsForRole,
  type NavItemConfig,
} from "@/components/layout/app-sidebar";

interface MobileBottomNavProps {
  role?: string;
  subject?: string | null;
  onNavigate?: (id: string) => void;
}

const PRIMARY_TAB_META: Record<
  string,
  { shortLabel: string; icon: React.ElementType }
> = {
  dashboard: { shortLabel: "Home", icon: LayoutDashboard },
  marks: { shortLabel: "Marks", icon: ClipboardEdit },
  students: { shortLabel: "Students", icon: Users },
  reports: { shortLabel: "Reports", icon: FileText },
};

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav({
  role = "teacher",
  subject = null,
  onNavigate,
}: MobileBottomNavProps) {
  const pathname = usePathname() || "/admin";
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const visibleItems = React.useMemo(
    () => getVisibleNavItemsForRole(role, subject),
    [role, subject]
  );

  // Pick up to 4 quick tabs prioritizing Home, Marks, Students, Reports if allowed
  const [keyboardFocused, setKeyboardFocused] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const isFormInput = (el: EventTarget | null): boolean => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (window.innerWidth < 768 && isFormInput(e.target)) {
        setKeyboardFocused(true);
      }
    };
    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (!isFormInput(document.activeElement)) {
          setKeyboardFocused(false);
        }
      }, 120);
    };

    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);
    return () => {
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const quickTabs = React.useMemo(() => {
    const priorityOrder = ["dashboard", "marks", "students", "reports"];
    const selected: NavItemConfig[] = [];

    for (const id of priorityOrder) {
      const match = visibleItems.find((item) => item.id === id);
      if (match) selected.push(match);
    }

    if (selected.length < 4) {
      for (const item of visibleItems) {
        if (!selected.some((s) => s.id === item.id)) {
          selected.push(item);
        }
        if (selected.length === 4) break;
      }
    }

    return selected;
  }, [visibleItems]);

  const sheetItems = React.useMemo(() => {
    const expanded: Array<{
      id: string;
      label: string;
      href: string;
      icon: React.ElementType;
    }> = [];

    for (const item of visibleItems) {
      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          expanded.push({
            id: child.id,
            label: child.label,
            href: child.href,
            icon: item.icon,
          });
        }
      } else {
        expanded.push({
          id: item.id,
          label: item.label,
          href: item.href,
          icon: item.icon,
        });
      }
    }
    return expanded;
  }, [visibleItems]);

  return (
    <>
      {moreOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More navigation modules"
        >
          <button
            type="button"
            aria-label="Close navigation drawer"
            onClick={() => setMoreOpen(false)}
            className="absolute inset-0 bg-slate-950/45"
          />

          <div className="relative z-10 w-full max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-[var(--bg-card,#ffffff)] border-t border-[var(--border,#e2e8f0)] shadow-2xl px-4 pt-3 pb-[calc(6rem+env(safe-area-inset-bottom))] adaptive-motion">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-3" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border,#e2e8f0)]">
              <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary,#0f172a)]">
                  All Modules
                </h2>
                <p className="text-[11px] text-[var(--text-secondary,#64748b)]">
                  Quick access across your assigned school tools
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more sheet"
                className="size-9 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {sheetItems.map((item) => {
                const Icon = item.icon;
                const active = isTabActive(pathname, item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      onNavigate?.(item.id);
                      setMoreOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between gap-2 min-h-[52px] px-3 py-2.5 rounded-2xl border transition-colors",
                      active
                        ? "bg-emerald-500/12 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold"
                        : "bg-[var(--bg-sunken,#f8fafc)] border-[var(--border,#e2e8f0)] text-[var(--text-primary,#0f172a)] hover:bg-[var(--bg-hover,#f1f5f9)] font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={cn(
                          "size-8 rounded-xl flex items-center justify-center shrink-0",
                          active
                            ? "bg-emerald-600 text-white"
                            : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-[var(--border,#e2e8f0)]"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="text-xs truncate">{item.label}</span>
                    </div>
                    <ChevronRight className="size-3.5 opacity-50 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile quick navigation"
        data-testid="mobile-bottom-nav"
        className={cn(
          "md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 print:hidden",
          "w-[calc(100vw-1.5rem)] max-w-[420px] h-16 px-2 rounded-full",
          "mb-[env(safe-area-inset-bottom)] border border-[var(--border,#e2e8f0)]",
          "adaptive-glass adaptive-motion flex items-center justify-between gap-1 transition-all duration-200",
          keyboardFocused && !moreOpen ? "opacity-0 translate-y-24 pointer-events-none" : "opacity-100 translate-y-0"
        )}
      >
        {quickTabs.map((tab) => {
          const meta = PRIMARY_TAB_META[tab.id];
          const Icon = meta?.icon || tab.icon;
          const shortLabel = meta?.shortLabel || tab.label.split(" ")[0];
          const active = isTabActive(pathname, tab.href);

          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={() => onNavigate?.(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center min-h-[48px] px-1.5 py-1 rounded-full adaptive-motion select-none",
                active
                  ? "bg-emerald-600 text-white shadow-sm font-bold"
                  : "text-[var(--text-secondary,#475569)] hover:text-[var(--text-primary,#0f172a)] font-medium"
              )}
            >
              <Icon className="size-4 mb-0.5 shrink-0" strokeWidth={active ? 2.3 : 1.85} />
              <span className="text-[10px] leading-none truncate max-w-full">
                {shortLabel}
              </span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          aria-label="More modules"
          aria-expanded={moreOpen}
          className={cn(
            "flex-1 flex flex-col items-center justify-center min-h-[48px] px-1.5 py-1 rounded-full adaptive-motion cursor-pointer select-none",
            moreOpen
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold"
              : "text-[var(--text-secondary,#475569)] hover:text-[var(--text-primary,#0f172a)] font-medium"
          )}
        >
          <MoreHorizontal className="size-4 mb-0.5 shrink-0" strokeWidth={2} />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </nav>
    </>
  );
}
