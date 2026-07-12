import { SidebarProvider, SidebarInset } from "./components/ui/sidebar";
import { AppSidebar } from "./components/app-sidebar";
import { AppTopbar } from "./components/app-topbar";
import { DashboardContent } from "./components/dashboard-content";
import { MobileBottomNav } from "./components/mobile-bottom-nav";

export default function App() {
  return (
    <SidebarProvider
      defaultOpen={true}
      style={{ fontFamily: "'Inter', 'Outfit', system-ui, sans-serif" }}
    >
      {/* Sidebar — collapses to sheet on mobile */}
      <AppSidebar />

      <SidebarInset className="bg-slate-50/70 min-h-screen">
        <AppTopbar breadcrumbs={["Admin", "Dashboard"]} currentPage="Dashboard" />
        <main className="flex-1 overflow-auto">
          <DashboardContent />
        </main>
      </SidebarInset>

      {/* Bottom navigation — only visible on mobile */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}
