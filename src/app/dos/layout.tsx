"use client";

import React, { useEffect, useState } from "react";
import { SidebarProvider } from "@/components/figma-ui/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { AppFooter } from "@/components/layout/app-footer";

import { createClient } from "@/utils/supabase/client";
import { usePathname } from "next/navigation";
import { cn } from "@/components/figma-ui/ui/utils";

export default function DOSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState("teacher");
  const pathname = usePathname();
  const isReportsPage = pathname === "/dos/reports";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }: any) => {
      const user = data.session?.user;
      if (user?.user_metadata) {
        setRole(user.user_metadata.role || 'teacher');
      }
    });
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full h-screen overflow-hidden bg-slate-50 dark:bg-[#0f172a] print:bg-white print:h-auto print:min-h-screen print:overflow-visible">
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
        </div>
      </div>
    </SidebarProvider>
  );
}
