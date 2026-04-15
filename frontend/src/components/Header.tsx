import { useState, useRef, useEffect, useMemo } from "react";
import {
  Bell,
  Moon,
  Search,
  Sun,
  User,
  LogOut,
  Settings,
  ChevronDown,
  LayoutDashboard,
  Radar,
  Globe,
  Brain,
  Clock,
  FileText,
  Bug,
  Activity,
  Zap,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNotificationStore } from "../store/notificationStore";

// ---------------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------------

function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo(() => {
    const baseEntries = [
      {
        label: "Dashboard",
        description: "Overview, metrics, and activity",
        path: "/dashboard",
        icon: LayoutDashboard,
        keywords: "home overview stats summary",
      },
      {
        label: "Scans",
        description: "Run and manage security scans",
        path: "/scans",
        icon: Radar,
        keywords: "scan target tools findings",
      },
      {
        label: "Recon",
        description: "Reconnaissance workflows and results",
        path: "/recon",
        icon: Globe,
        keywords: "recon osint domain subdomain",
      },
      {
        label: "AI Analysis",
        description: "AI-assisted threat and finding analysis",
        path: "/ai",
        icon: Brain,
        keywords: "ai analysis explain remediation",
      },
      {
        label: "Timeline",
        description: "Events and incident timeline",
        path: "/timeline",
        icon: Clock,
        keywords: "events activity incident history",
      },
      {
        label: "Reports",
        description: "Generate and export reports",
        path: "/reports",
        icon: FileText,
        keywords: "pdf report export compliance",
      },
      {
        label: "Bug Bounty",
        description: "Bounty programs and submissions",
        path: "/bugbounty",
        icon: Bug,
        keywords: "bounty submissions rewards",
      },
      {
        label: "SOC / Phase5",
        description: "SOC and advanced operations center",
        path: "/phase5",
        icon: Activity,
        keywords: "soc phase5 operations alerts",
      },
      {
        label: "Agents",
        description: "Agent fleet and execution status",
        path: "/agents",
        icon: Zap,
        keywords: "agents autonomous runtime",
      },
      {
        label: "Settings",
        description: "Preferences and account defaults",
        path: "/settings",
        icon: SlidersHorizontal,
        keywords: "preferences defaults profile",
      },
    ];

    if (user?.role === "admin") {
      baseEntries.push({
        label: "Admin",
        description: "Administrative controls and users",
        path: "/admin",
        icon: Shield,
        keywords: "admin users governance",
      });
    }

    return baseEntries;
  }, [user?.role]);

  const normalized = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalized) {
      return entries.slice(0, 8);
    }
    return entries
      .filter((item) =>
        `${item.label} ${item.description} ${item.keywords}`.toLowerCase().includes(normalized),
      )
      .slice(0, 8);
  }, [entries, normalized]);
  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") {
      return "Ctrl+K";
    }
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "⌘K" : "Ctrl+K";
  }, []);

  const goTo = (path: string) => {
    setOpen(false);
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  useEffect(() => {
    setActiveIndex(0);
  }, [normalized]);

  useEffect(() => {
    const onGlobalShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };

    const onOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onGlobalShortcut);
    document.addEventListener("mousedown", onOutsideClick);
    return () => {
      document.removeEventListener("keydown", onGlobalShortcut);
      document.removeEventListener("mousedown", onOutsideClick);
    };
  }, []);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        setOpen(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((idx) => (results.length ? (idx + 1) % results.length : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) => (results.length ? (idx - 1 + results.length) % results.length : 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (results[activeIndex]) {
        goTo(results[activeIndex].path);
      }
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search pages…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={[
          "h-9 w-64 rounded-lg border bg-slate-800 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500",
          "outline-none transition-all duration-200",
          open
            ? "border-cyan-500 ring-1 ring-cyan-500/30 w-80"
            : "border-slate-700 hover:border-slate-600",
        ].join(" ")}
        role="combobox"
        aria-expanded={open}
        aria-controls="global-search-results"
        aria-label="Global search"
      />
      {open && (
        <div
          id="global-search-results"
          className="absolute top-full left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        >
          <div className="border-b border-slate-800 px-3 py-2 text-xs text-slate-500">
            Press{" "}
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300">
              {shortcutLabel}
            </kbd>{" "}
            to focus, <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300">↑↓</kbd>{" "}
            to navigate
          </div>

          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">No matching pages found.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1" role="listbox" aria-label="Search results">
              {results.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;
                return (
                  <li key={item.path}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goTo(item.path)}
                      className={[
                        "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-cyan-500/10" : "hover:bg-slate-800/80",
                      ].join(" ")}
                    >
                      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-slate-400">{item.description}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notification Bell
// ---------------------------------------------------------------------------

function NotificationBell() {
  const notifications = useNotificationStore((s) => s.notifications);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
            <span className="text-sm font-semibold text-slate-200">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-500">
                <Bell className="mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={[
                    "border-b border-slate-800 px-4 py-3 text-sm last:border-0",
                    n.type === "error" ? "text-rose-300" :
                    n.type === "warning" ? "text-amber-300" :
                    n.type === "success" ? "text-emerald-300" : "text-slate-300",
                  ].join(" ")}
                >
                  {n.message}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Menu
// ---------------------------------------------------------------------------

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.full_name
    ? user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden text-sm font-medium md:block max-w-[120px] truncate">
          {user?.full_name ?? user?.email ?? "User"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          <div className="border-b border-slate-700 px-4 py-3">
            <p className="text-sm font-semibold text-slate-200 truncate">
              {user?.full_name ?? "User"}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <span className="mt-1 inline-block rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-400 capitalize">
              {user?.role ?? "user"}
            </span>
          </div>

          <div className="p-1">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>

          <div className="border-t border-slate-700 p-1">
            <button
              onClick={() => { setOpen(false); logout(); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header (exported)
// ---------------------------------------------------------------------------

export function Header() {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur-md">
      {/* Left — search */}
      <div className="flex items-center">
        <GlobalSearch />
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
