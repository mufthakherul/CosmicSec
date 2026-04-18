import { useState } from "react";
import { HamburgerButton, Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileBottomNav } from "./MobileBottomNav";
import { Toast } from "./Toast";
import { useNetworkPreferencesStore } from "../store/networkPreferencesStore";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const torMode = useNetworkPreferencesStore((s) => s.torMode);
  const cycleTorMode = useNetworkPreferencesStore((s) => s.cycleTorMode);

  const torModeLabel =
    torMode === "enabled" ? "Tor On" : torMode === "disabled" ? "Tor Off" : "Tor Auto";

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
          <button
            type="button"
            onClick={cycleTorMode}
            className="ml-auto rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-cyan-300"
            title="Cycle global Tor mode"
            aria-label="Cycle global Tor mode"
          >
            {torModeLabel}
          </button>
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
