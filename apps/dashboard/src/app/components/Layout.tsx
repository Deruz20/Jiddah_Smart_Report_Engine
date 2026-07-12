import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { BottomNav } from "./BottomNav";
import { Toast } from "@/components/Toast";
import { PageTransition } from "./PageTransition";

export function Layout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#F7F8F7" }}>
      <Sidebar 
        desktopCollapsed={desktopCollapsed} 
        onDesktopToggle={() => setDesktopCollapsed(!desktopCollapsed)}
      />
      <TopNav 
        sidebarCollapsed={desktopCollapsed} 
      />
      <main
        className={`transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pb-16 lg:pb-0 pt-[72px] lg:pt-0 min-h-screen ${
          desktopCollapsed ? "lg:ml-16" : "lg:ml-64"
        }`}
      >
        <div className="p-6">
          <PageTransition />
        </div>
      </main>
      <BottomNav />
      <Toast position="top-right" richColors />
    </div>
  );
}
