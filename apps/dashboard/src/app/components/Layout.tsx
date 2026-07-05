import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Toast } from "@/components/Toast";
import { PageTransition } from "./PageTransition";

export function Layout() {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#F7F8F7" }}>
      <Sidebar 
        desktopCollapsed={desktopCollapsed} 
        onDesktopToggle={() => setDesktopCollapsed(!desktopCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <TopNav 
        sidebarCollapsed={desktopCollapsed} 
        onMobileMenuClick={() => setMobileOpen(true)}
      />
      <main
        className="transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{
          marginLeft: typeof window !== "undefined" && window.innerWidth >= 1024 
            ? (desktopCollapsed ? "80px" : "280px") 
            : "0px",
          paddingTop: "72px",
          minHeight: "100vh",
        }}
      >
        <div className="p-4 sm:p-6 lg:p-8">
          <PageTransition />
        </div>
      </main>
      <Toast position="top-right" richColors />
    </div>
  );
}
