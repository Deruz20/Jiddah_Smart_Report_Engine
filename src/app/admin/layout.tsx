"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/figma-ui/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { ProductTour } from "@/components/ProductTour";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/components/figma-ui/ui/utils";
import {
  applyThemeModeToDom,
  getStoredThemeMode,
  resolveEffectiveTheme,
} from "@/lib/client-cache";
import { applyDeviceTierToDom } from "@/lib/device-tier";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showTour, setShowTour] = useState(false);
  const [role, setRole] = useState("teacher");
  const [subject, setSubject] = useState<string | null>(null);
  const [, setWorkspaceDark] = useState(false);
  const pathname = usePathname();
  const isReportsPage = pathname === "/admin/reports";

  useEffect(() => {
    applyDeviceTierToDom();
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
    supabase.auth.getSession().then(async ({ data }: any) => {
      const user = data.session?.user;
      if (user) {
        const meta = user.user_metadata || {};
        setRole(meta.role || "teacher");
        setSubject(meta.subject || null);

        // Sync role/subject from teachers profile when metadata is minimal
        try {
          const { data: teacher } = await supabase
            .from("teachers")
            .select("role, subject")
            .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
            .maybeSingle();
          if (teacher?.role) setRole(teacher.role);
          if (teacher?.subject !== undefined) setSubject(teacher.subject);
        } catch {
          // Offline or restricted query keeps metadata fallback
        }

        const dismissedLocally =
          typeof window !== "undefined" &&
          localStorage.getItem("jiddah_tour_completed") === "true";
        if (!meta.tour_completed && !dismissedLocally) {
          setShowTour(true);
        }
      }
    });
  }, []);

  const handleCloseTour = async () => {
    setShowTour(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("jiddah_tour_completed", "true");
    }
    const supabase = createClient();
    try {
      await supabase.auth.updateUser({
        data: { tour_completed: true },
      });
    } catch {
      // Ignore network errors
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset
        className={cn(
          "h-[100dvh] print:h-auto print:min-h-screen overflow-hidden print:overflow-visible print:bg-white flex flex-col min-w-0 max-w-full relative transition-colors",
          "bg-[var(--bg-canvas)] text-[var(--text-primary)]"
        )}
      >
        <AppTopbar />
        <main
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-x-hidden pb-4 sm:pb-5 md:pb-0 relative",
            isReportsPage ? "overflow-y-hidden" : "overflow-y-auto"
          )}
        >
          {children}
        </main>
        <ProductTour isOpen={showTour} onClose={handleCloseTour} role={role} />
      </SidebarInset>
    </SidebarProvider>
  );
}
