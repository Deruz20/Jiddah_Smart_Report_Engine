"use client";

import React from "react";
import { SidebarProvider } from "@/components/figma-ui/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex w-full h-screen print:h-auto print:min-h-screen overflow-hidden print:overflow-visible bg-slate-50 dark:bg-[#0f172a] print:bg-white">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopbar />
          <main className="flex-1 overflow-y-auto print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
