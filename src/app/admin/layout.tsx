"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardEdit,
  Users,
  FileText,
  Menu,
} from "lucide-react";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/figma-ui/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { ProductTour } from "@/components/ProductTour";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/components/figma-ui/ui/utils";
import {
  applyThemeModeToDom,
  getStoredThemeMode,
  resolveEffectiveTheme,
} from "@/lib/client-cache";

function MobileBottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  const tabs = [
    { id: "dashboard", label: "Home", href: "/admin", icon: LayoutDashboard },
    { id: "marks", label: "Marks", href: "/admin/marks", icon: ClipboardEdit },
    { id: "students", label: "Students", href: "/admin/students", icon: Users },
    { id: "reports", label: "Reports", href: "/admin/reports", icon: FileText },
  ];

  return (
    <nav
      aria-label="Mobile quick navigation"
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#0B1120]/95 backdrop-blur-md border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)] print:hidden"
    >
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2.5 py-1 rounded-xl transition-all",
                active
                  ? "text-[#34D399] bg-emerald-500/15 font-bold"
                  : "text-[#94A3B8] hover:text-white font-medium"
              )}
            >
              <Icon className="size-4 mb-0.5" strokeWidth={active ? 2.3 : 1.8} />
              <span className="text-[10px] leading-none">{tab.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="More menu"
          className="flex flex-col items-center justify-center min-h-[44px] min-w-[56px] px-2.5 py-1 rounded-xl text-[#94A3B8] hover:text-white font-medium transition-all cursor-pointer"
        >
          <Menu className="size-4 mb-0.5" strokeWidth={1.8} />
          <span className="text-[10px] leading-none">More</span>
        </button>
      </div>
    </nav>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showTour, setShowTour] = useState(false);
  const [role, setRole] = useState("teacher");
  const [workspaceDark, setWorkspaceDark] = useState(false);
  const pathname = usePathname();
  const isReportsPage = pathname === "/admin/reports";

  useEffect(() => {
    const syncTheme = () => {
      const mode = getStoredThemeMode();
      applyThemeModeToDom(mode);
      const resolved = resolveEffectiveTheme(mode);
      setWorkspaceDark(resolved.workspaceDark);
    };
    syncTheme();
    window.addEventListener("jiddah-theme-changed", syncTheme);
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const handleMq = () => syncTheme();
    mq?.addEventListener?.("change", handleMq);
    return () => {
      window.removeEventListener("jiddah-theme-changed", syncTheme);
      mq?.removeEventListener?.("change", handleMq);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user?.user_metadata) {
        setRole(user.user_metadata.role || "teacher");
        if (!user.user_metadata.tour_completed) {
          setShowTour(true);
        }
      }
    });
  }, []);

  const handleCloseTour = async () => {
    setShowTour(false);
    const supabase = createClient();
    await supabase.auth.updateUser({
      data: { tour_completed: true },
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset
        className={cn(
          "h-screen print:h-auto print:min-h-screen overflow-hidden print:overflow-visible print:bg-white flex flex-col min-w-0 max-w-full relative transition-colors",
          workspaceDark ? "bg-[#0F172A] text-stone-100" : "bg-[#F8FAFC] text-stone-900"
        )}
      >
        <AppTopbar />
        <div
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-x-hidden pb-14 md:pb-0 relative",
            isReportsPage ? "overflow-y-hidden" : "overflow-y-auto"
          )}
        >
          <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full relative">
            {children}
          </div>
        </div>
        <AppFooter />
        <MobileBottomNav />
        <ProductTour isOpen={showTour} onClose={handleCloseTour} role={role} />
      </SidebarInset>
    </SidebarProvider>
  );
}
