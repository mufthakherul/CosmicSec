import { useState } from "react";
import { HamburgerButton, Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toast } from "./Toast";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main content — offset by the actual sidebar width on md+ */}
      <div
        className={[
          "flex flex-1 flex-col transition-all duration-300 min-w-0",
          sidebarCollapsed ? "md:pl-16" : "md:pl-64",
        ].join(" ")}
      >
        {/* Mobile top bar */}
        <div className="flex h-14 items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 backdrop-blur-md md:hidden">
          <HamburgerButton onClick={() => setMobileOpen(true)} />
          <span className="text-sm font-semibold text-slate-200">CosmicSec</span>
        </div>

        {/* Desktop header bar */}
        <div className="hidden md:block">
          <Header />
        </div>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>

      <MobileBottomNav />
      <Toast />
    </div>
  );
}
