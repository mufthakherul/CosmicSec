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
  Keyboard,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNotificationStore } from "../store/notificationStore";
import { useNetworkPreferencesStore } from "../store/networkPreferencesStore";
import { useSearch } from "../hooks/useSearch";

// ---------------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------------

function GlobalSearch() {
  type SearchRow = {
    id: string;
    label: string;
    description: string;
    path: string;
    icon: LucideIcon;
    keywords?: string;
  };

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { query, setQuery, results: apiResults, isLoading, error } = useSearch();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickLinks = useMemo(() => {
    const baseEntries: SearchRow[] = [
      {
        id: "link-dashboard",
        label: "Dashboard",
        description: "Overview, metrics, and activity",
        path: "/dashboard",
        icon: LayoutDashboard,
        keywords: "home overview stats summary",
      },
      {
        id: "link-scans",
        label: "Scans",
        description: "Run and manage security scans",
        path: "/scans",
        icon: Radar,
        keywords: "scan target tools findings",
      },
      {
        id: "link-recon",
        label: "Recon",
        description: "Reconnaissance workflows and results",
        path: "/recon",
        icon: Globe,
        keywords: "recon osint domain subdomain",
      },
      {
        id: "link-ai",
        label: "AI Analysis",
        description: "AI-assisted threat and finding analysis",
        path: "/ai",
        icon: Brain,
        keywords: "ai analysis explain remediation",
      },
      {
        id: "link-timeline",
        label: "Timeline",
        description: "Events and incident timeline",
        path: "/timeline",
        icon: Clock,
        keywords: "events activity incident history",
      },
      {
        id: "link-reports",
        label: "Reports",
        description: "Generate and export reports",
        path: "/reports",
        icon: FileText,
        keywords: "pdf report export compliance",
      },
      {
        id: "link-bugbounty",
        label: "Bug Bounty",
        description: "Bounty programs and submissions",
        path: "/bugbounty",
        icon: Bug,
        keywords: "bounty submissions rewards",
      },
      {
        id: "link-phase5",
        label: "SOC / Phase5",
        description: "SOC and advanced operations center",
        path: "/phase5",
        icon: Activity,
        keywords: "soc phase5 operations alerts",
      },
      {
        id: "link-agents",
        label: "Agents",
        description: "Agent fleet and execution status",
        path: "/agents",
        icon: Zap,
        keywords: "agents autonomous runtime",
      },
      {
        id: "link-settings",
        label: "Settings",
        description: "Preferences and account defaults",
        path: "/settings",
        icon: SlidersHorizontal,
        keywords: "preferences defaults profile",
      },
    ];

    if (user?.role === "admin") {
      baseEntries.push({
        id: "link-admin",
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
  const fallbackLinks = useMemo(() => {
    if (!normalized) {
      return quickLinks.slice(0, 8);
    }
    return quickLinks
      .filter((item) =>
        [item.label, item.description, item.keywords]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 8);
  }, [quickLinks, normalized]);

  const sections = useMemo(() => {
    if (!normalized) {
      return [{ title: "Quick links", items: fallbackLinks }];
    }

    if (error) {
      return [{ title: "Quick links", items: fallbackLinks }];
    }

    const scanItems: SearchRow[] = apiResults.scans.map((scan) => ({
      id: `scan-${scan.id}`,
      label: scan.target || scan.id,
      description: `Scan ${scan.id} • ${scan.status}`,
      path: `/scans/${scan.id}`,
      icon: Radar,
    }));

    const findingItems: SearchRow[] = apiResults.findings.map((finding) => ({
      id: `finding-${finding.id}`,
      label: finding.title || finding.id,
      description: `${finding.severity} finding • scan ${finding.scan_id}`,
      path: `/scans/${finding.scan_id}`,
      icon: Bug,
    }));

    const agentItems: SearchRow[] = apiResults.agents.map((agent) => ({
      id: `agent-${agent.id}`,
      label: agent.name || agent.id,
      description: `${agent.status} • ${agent.id}`,
      path: "/agents",
      icon: Zap,
    }));

    const reportItems: SearchRow[] = apiResults.reports.map((report) => ({
      id: `report-${report.id}`,
      label: report.id,
      description: `${report.format.toUpperCase()} • ${report.status}`,
      path: "/reports",
      icon: FileText,
    }));

    const pluginItems: SearchRow[] = apiResults.plugins.map((plugin) => ({
      id: `plugin-${plugin.name}`,
      label: plugin.name,
      description: `${plugin.author ?? "Unknown author"} • ${plugin.version ?? "n/a"}`,
      path: `/plugins/${encodeURIComponent(plugin.name)}`,
      icon: Shield,
    }));

    const eventItems: SearchRow[] = apiResults.events.map((event) => ({
      id: `event-${event.id}`,
      label: event.title,
      description:
        event.description || `${event.status ?? "event"} • ${event.plugin ?? "timeline"}`,
      path: event.scan_id
        ? `/scans/${event.scan_id}`
        : event.plugin
          ? `/plugins/${encodeURIComponent(event.plugin)}`
          : "/timeline",
      icon: Clock,
    }));

    return [
      { title: "Scans", items: scanItems },
      { title: "Findings", items: findingItems },
      { title: "Agents", items: agentItems },
      { title: "Reports", items: reportItems },
      { title: "Plugins", items: pluginItems },
      { title: "Events", items: eventItems },
    ].filter((section) => section.items.length > 0);
  }, [apiResults, error, fallbackLinks, normalized]);

  const resultItems: SearchRow[] = useMemo(
    () => sections.flatMap((section) => section.items),
    [sections],
  );
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
      setActiveIndex((idx) => (resultItems.length ? (idx + 1) % resultItems.length : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((idx) =>
        resultItems.length ? (idx - 1 + resultItems.length) % resultItems.length : 0,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      // eslint-disable-next-line security/detect-object-injection
      if (resultItems[activeIndex]) {
        // eslint-disable-next-line security/detect-object-injection
        goTo(resultItems[activeIndex].path);
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
          "input-glow outline-none transition-all duration-200",
          open
            ? "border-cyan-500 ring-1 ring-cyan-500/30 w-80"
            : "border-slate-700 hover:border-slate-600",
        ].join(" ")}
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
            to focus,{" "}
            <kbd className="rounded bg-slate-700 px-1.5 py-0.5 font-mono text-xs text-slate-300">
              ↑↓
            </kbd>{" "}
            to navigate
          </div>

          {error && normalized && (
            <div className="border-b border-amber-700/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Search unavailable — showing quick links.
            </div>
          )}

          {isLoading && normalized ? (
            <div className="px-4 py-6 text-sm text-slate-400">Searching…</div>
          ) : resultItems.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400">No matching results found.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1" aria-label="Search results">
              {sections.map((section) => (
                <li key={section.title}>
                  <p className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const itemIndex = resultItems.findIndex((entry) => entry.id === item.id);
                    const Icon = item.icon;
                    const isActive = itemIndex === activeIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(itemIndex)}
                        onClick={() => goTo(item.path)}
                        className={[
                          "flex w-full items-start gap-3 px-3 py-2 text-left transition-colors",
                          isActive ? "bg-cyan-500/10" : "hover:bg-slate-800/80",
                        ].join(" ")}
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-slate-100">
                            {item.label}
                          </span>
                          <span className="block truncate text-xs text-slate-400">
                            {item.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </li>
              ))}
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
              <button onClick={clearAll} className="text-xs text-cyan-400 hover:text-cyan-300">
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
                    n.type === "error"
                      ? "text-rose-300"
                      : n.type === "warning"
                        ? "text-amber-300"
                        : n.type === "success"
                          ? "text-emerald-300"
                          : "text-slate-300",
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
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "?");

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
        aria-haspopup="true"
        aria-label="User menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-cyan-500 to-blue-600 text-xs font-bold text-white">
          {initials}
        </div>
        <span className="hidden max-w-30 truncate text-sm font-medium md:block">
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
              onClick={() => {
                setOpen(false);
                logout();
              }}
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
  const torMode = useNetworkPreferencesStore((s) => s.torMode);
  const cycleTorMode = useNetworkPreferencesStore((s) => s.cycleTorMode);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const torModeBadge =
    torMode === "enabled"
      ? { label: "Tor On", className: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10" }
      : torMode === "disabled"
        ? { label: "Tor Off", className: "text-slate-300 border-slate-600 bg-slate-800/70" }
        : { label: "Tor Auto", className: "text-cyan-300 border-cyan-500/40 bg-cyan-500/10" };

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if (event.key === "?" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const isTyping =
          target?.tagName === "INPUT" ||
          target?.tagName === "TEXTAREA" ||
          target?.isContentEditable;
        if (!isTyping) {
          event.preventDefault();
          setShortcutsOpen(true);
        }
      }
      if (event.key === "Escape") {
        setShortcutsOpen(false);
      }
    };
    document.addEventListener("keydown", onShortcut);
    return () => document.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 px-4 backdrop-blur-md">
        {/* Left — search */}
        <div className="flex items-center">
          <GlobalSearch />
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={cycleTorMode}
            className={[
              "rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide transition-colors",
              torModeBadge.className,
            ].join(" ")}
            title="Global Tor mode for all tools: Disabled -> Auto -> Enabled"
            aria-label="Cycle global Tor mode"
          >
            {torModeBadge.label}
          </button>

          <button
            onClick={() => setShortcutsOpen(true)}
            className="ripple rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Open keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-5 w-5" />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="ripple rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
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

      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="page-enter w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Keyboard shortcuts</h2>
              <button
                onClick={() => setShortcutsOpen(false)}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                Esc
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Ctrl/⌘ + K</kbd> Focus global
                search
              </p>
              <p>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5">?</kbd> Open this shortcuts
                panel
              </p>
              <p>
                <kbd className="rounded bg-slate-800 px-1.5 py-0.5">Esc</kbd> Close dialogs and
                overlays
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
