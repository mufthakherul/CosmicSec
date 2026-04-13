import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import {
  Activity,
  Brain,
  Bug,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Radar,
  Shield,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Scans", to: "/scans", icon: Radar },
  { label: "Recon", to: "/recon", icon: Globe },
  { label: "AI Analysis", to: "/ai", icon: Brain },
  { label: "Timeline", to: "/timeline", icon: Clock },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Bug Bounty", to: "/bugbounty", icon: Bug },
  { label: "Profile", to: "/profile", icon: User },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ mobileOpen, onMobileClose, collapsed, onCollapsedChange }: SidebarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onMobileClose]);

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(to);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800 bg-slate-950 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 flex-shrink-0 text-cyan-400" />
              <span className="text-lg font-bold tracking-tight text-slate-100">CosmicSec</span>
            </div>
          )}
          {collapsed && <Shield className="mx-auto h-6 w-6 text-cyan-400" />}

          <div className="flex items-center gap-1">
            {/* Mobile close button */}
            <button
              onClick={onMobileClose}
              className="rounded p-1 text-slate-400 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="hidden rounded p-1 text-slate-400 hover:text-white md:block"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav role="navigation" aria-label="Main navigation" className="flex-1 overflow-y-auto px-2 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  onClick={onMobileClose}
                  title={collapsed ? label : undefined}
                  aria-current={isActive(to) ? "page" : undefined}
                  className={[
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive(to)
                      ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info + logout */}
        <div className="border-t border-slate-800 p-3">
          {!collapsed ? (
            <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-200">{user?.email ?? "—"}</p>
                <p className="truncate text-xs capitalize text-slate-500">{user?.role ?? "user"}</p>
              </div>
            </div>
          ) : (
            <div className="mb-2 flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
                <User className="h-4 w-4" />
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title={collapsed ? "Log out" : undefined}
            className={[
              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400",
              collapsed ? "justify-center" : "",
            ].join(" ")}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Mobile hamburger trigger — exported separately for use in AppLayout        */
/* -------------------------------------------------------------------------- */

interface HamburgerProps {
  onClick: () => void;
}

export function HamburgerButton({ onClick }: HamburgerProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white md:hidden"
      aria-label="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </button>
  );
}
