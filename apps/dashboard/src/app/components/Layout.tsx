import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";
import { Toast } from "@/components/Toast";
import { PageTransition } from "./PageTransition";

export function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#FEFDF8" }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <TopNav sidebarCollapsed={collapsed} />
      <main
        className="transition-all duration-300 ease-in-out"
        style={{
          marginLeft: collapsed ? "64px" : "256px",
          paddingTop: "64px",
          minHeight: "100vh",
        }}
      >
        <div className="p-6">
          <PageTransition />
        </div>
      </main>
      <Toast position="top-right" richColors />
    </div>
  );
}
