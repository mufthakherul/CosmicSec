import { NavLink } from "react-router-dom";
import { Brain, LayoutDashboard, Radar, ScanSearch, UserCircle2 } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/scans", label: "Scans", icon: Radar },
  { to: "/recon", label: "Recon", icon: ScanSearch },
  { to: "/ai", label: "AI", icon: Brain },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
] as const;

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur-md md:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="grid grid-cols-5 gap-1">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex min-h-12 flex-col items-center justify-center rounded-lg text-[11px] transition-colors",
                  isActive ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                ].join(" ")
              }
            >
              <item.icon className="mb-0.5 h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
