"use client";

import React, { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/figma-ui/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AppFooter } from "@/components/layout/app-footer";
import { ProductTour } from "@/components/ProductTour";
import { createClient } from "@/utils/supabase/client";

import { usePathname } from "next/navigation";
import { cn } from "@/components/figma-ui/ui/utils";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showTour, setShowTour] = useState(false);
  const [role, setRole] = useState("teacher");
  const pathname = usePathname();
  const isReportsPage = pathname === "/admin/reports";
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.user_metadata) {
        setRole(data.user.user_metadata.role || 'teacher');
        if (!data.user.user_metadata.tour_completed) {
          setShowTour(true);
        }
      }
    });
  }, [supabase]);

  const handleCloseTour = async () => {
    setShowTour(false);
    await supabase.auth.updateUser({
      data: { tour_completed: true }
    });
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full h-screen print:h-auto print:min-h-screen overflow-hidden print:overflow-visible bg-slate-50 dark:bg-[#0f172a] print:bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <AppTopbar />
          <main className={cn(
            "flex-1 flex flex-col print:overflow-visible",
            isReportsPage ? "overflow-hidden" : "overflow-y-auto"
          )}>
            <div className="flex-1 flex flex-col min-h-0 relative">
              {children}
            </div>
            {!isReportsPage && <AppFooter />}
          </main>
          <ProductTour isOpen={showTour} onClose={handleCloseTour} role={role} />
        </div>
      </div>
    </SidebarProvider>
  );
}
