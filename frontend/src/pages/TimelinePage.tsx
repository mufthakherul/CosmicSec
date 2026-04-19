import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Download, Filter, Loader2, RefreshCw, Search } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EventSource = "web_scan" | "agent_local" | "api" | "integration" | "plugin";
type Severity = "critical" | "high" | "medium" | "low" | "info";
type FilterSource = "all" | EventSource;
type FilterSeverity = "all" | Severity;
type FilterDateRange = "today" | "7d" | "30d" | "all";

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  source: EventSource;
  target?: string;
  scan_id?: string;
  timestamp: string; // ISO-8601
}

interface PluginAuditEvent {
  timestamp?: string;
  action?: string;
  plugin?: string;
  detail?: string;
  status?: "ok" | "warn" | "error" | string;
  actor?: string;
  actor_role?: string;
  context?: {
    scan_id?: string | null;
    target?: string;
    success?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Mock data (used when API calls fail)
// ---------------------------------------------------------------------------

const MOCK_EVENTS: TimelineEvent[] = [
  {
    id: "mock-1",
    title: "SQL Injection Detected",
    description: "Blind SQL injection found in /api/users endpoint via parameter id.",
    severity: "critical",
    source: "web_scan",
    target: "api.example.com",
    scan_id: "scan-001",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-2",
    title: "Open Redis Port Exposed",
    description: "Port 6379 is publicly accessible without authentication.",
    severity: "high",
    source: "agent_local",
    target: "db.example.com",
    scan_id: "scan-002",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-3",
    title: "Outdated SSL Certificate",
    description: "TLS 1.0 still enabled on the load balancer.",
    severity: "medium",
    source: "integration",
    target: "lb.example.com",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-4",
    title: "DNS Enumeration Completed",
    description: "31 subdomains discovered during recon phase.",
    severity: "info",
    source: "api",
    target: "example.com",
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "mock-5",
    title: "Missing Security Headers",
    description: "Content-Security-Policy and X-Frame-Options headers absent on homepage.",
    severity: "low",
    source: "web_scan",
    target: "www.example.com",
    scan_id: "scan-003",
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function isWithinRange(isoDate: string, range: FilterDateRange): boolean {
  if (range === "all") return true;
  const ts = new Date(isoDate).getTime();
  const now = Date.now();
  if (range === "today") return now - ts < 86_400_000;
  if (range === "7d") return now - ts < 7 * 86_400_000;
  if (range === "30d") return now - ts < 30 * 86_400_000;
  return true;
}

function inferPluginName(event: TimelineEvent): string | null {
  const target = (event.target ?? "").trim();
  if (/^plugin[:/]/i.test(target)) {
    return target.replace(/^plugin[:/]/i, "").trim() || null;
  }

  const combined = `${event.title} ${event.description} ${target}`;
  const explicitActionMatch = combined.match(
    /plugin\s+(?:run|loaded|enabled|disabled)\s*:\s*([a-zA-Z0-9_.-]+)/i,
  );
  if (explicitActionMatch) {
    return explicitActionMatch[1];
  }

  const match = combined.match(/plugin(?:name)?[\s:=]+([a-zA-Z0-9_.-]+)/i);
  return match ? match[1] : null;
}

function getPluginTarget(event: TimelineEvent): string | null {
  return inferPluginName(event);
}

function getTimelineActionLabel(event: TimelineEvent): string {
  const pluginName = getPluginTarget(event);
  if (event.scan_id && pluginName) return "Open scan + plugin";
  if (event.scan_id) return "Open scan";
  if (pluginName) return "Open plugin";
  return "Open scans";
}

function getEventContextLabel(event: TimelineEvent): string {
  return getTimelineActionLabel(event);
}

const SEVERITY_DOT: Record<Severity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
  info: "bg-gray-400",
};

const SEVERITY_TEXT: Record<Severity, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-blue-400",
  info: "text-gray-400",
};

const SOURCE_BADGE: Record<EventSource, string> = {
  web_scan: "bg-purple-500/20 text-purple-300 ring-purple-500/30",
  agent_local: "bg-green-500/20 text-green-300 ring-green-500/30",
  api: "bg-blue-500/20 text-blue-300 ring-blue-500/30",
  integration: "bg-yellow-500/20 text-yellow-300 ring-yellow-500/30",
  plugin: "bg-indigo-500/20 text-indigo-300 ring-indigo-500/30",
};

const SOURCE_LABELS: Record<EventSource, string> = {
  web_scan: "Web Scan",
  agent_local: "Agent",
  api: "API",
  integration: "Integration",
  plugin: "Plugin",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TimelinePage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filterSource, setFilterSource] = useState<FilterSource>("all");
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>("all");
  const [filterDateRange, setFilterDateRange] = useState<FilterDateRange>("all");
  const [filterTarget, setFilterTarget] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [swipedCardId, setSwipedCardId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const openEventContext = (event: TimelineEvent) => {
    if (event.scan_id) {
      navigate(`/scans/${event.scan_id}`);
      return;
    }
    const pluginName = getPluginTarget(event);
    if (pluginName) {
      navigate(`/plugins/${encodeURIComponent(pluginName)}`);
      return;
    }
    navigate("/scans");
  };

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [scansRes, findingsRes, pluginAuditRes] = await Promise.all([
        fetch(`${API}/api/scans`, { headers }),
        fetch(`${API}/api/findings`, { headers }),
        fetch(`${API}/api/plugins/audit?limit=40`, { headers }),
      ]);

      const combined: TimelineEvent[] = [];

      if (scansRes.ok) {
        interface ScanItem {
          id?: string;
          target?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
          findings?: { title?: string; severity?: string; description?: string }[];
        }
        const scansData = (await scansRes.json()) as ScanItem[] | { items?: ScanItem[] };
        const scans: ScanItem[] = Array.isArray(scansData)
          ? scansData
          : ((scansData as { items?: ScanItem[] }).items ?? []);

        for (const scan of scans) {
          const findings = scan.findings ?? [];
          if (findings.length > 0) {
            for (const f of findings) {
              combined.push({
                id: `scan-${scan.id ?? ""}-${f.title ?? ""}`,
                title: f.title ?? "Scan Finding",
                description: f.description ?? "",
                severity: (f.severity as Severity) ?? "info",
                source: "web_scan",
                target: scan.target,
                scan_id: scan.id,
                timestamp: scan.updated_at ?? scan.created_at ?? new Date().toISOString(),
              });
            }
          } else {
            combined.push({
              id: `scan-${scan.id ?? ""}`,
              title: `Scan completed: ${scan.target ?? "unknown"}`,
              description: `Status: ${scan.status ?? "unknown"}`,
              severity: "info",
              source: "web_scan",
              target: scan.target,
              scan_id: scan.id,
              timestamp: scan.updated_at ?? scan.created_at ?? new Date().toISOString(),
            });
          }
        }
      }

      if (findingsRes.ok) {
        interface FindingItem {
          id?: string;
          title?: string;
          severity?: string;
          description?: string;
          target?: string;
          source?: string;
          created_at?: string;
        }
        const findingsData = (await findingsRes.json()) as
          | FindingItem[]
          | { items?: FindingItem[] };
        const findings: FindingItem[] = Array.isArray(findingsData)
          ? findingsData
          : ((findingsData as { items?: FindingItem[] }).items ?? []);

        for (const f of findings) {
          combined.push({
            id: `finding-${f.id ?? Math.random()}`,
            title: f.title ?? "Finding",
            description: f.description ?? "",
            severity: (f.severity as Severity) ?? "info",
            source: (f.source as EventSource) ?? "api",
            target: f.target,
            timestamp: f.created_at ?? new Date().toISOString(),
          });
        }
      }

      const statusToSeverity = (status: string | undefined): Severity => {
        if (status === "error") return "high";
        if (status === "warn") return "medium";
        return "info";
      };

      if (headers.Authorization && pluginAuditRes.ok) {
        const payload = (await pluginAuditRes.json()) as { items?: PluginAuditEvent[] };
        const items = payload.items ?? [];
        for (const item of items) {
          const pluginName = item.plugin ?? "registry";
          const action = item.action ?? "event";
          const target = item.context?.target ?? `plugin:${pluginName}`;
          combined.push({
            id: `plugin-${pluginName}-${item.timestamp ?? Math.random()}`,
            title: `Plugin ${action}: ${pluginName}`,
            description: item.detail ?? "Plugin trust event",
            severity: statusToSeverity(item.status),
            source: "plugin",
            target,
            scan_id: item.context?.scan_id ?? undefined,
            timestamp: item.timestamp ?? new Date().toISOString(),
          });
        }
      }

      if (combined.length === 0 && !scansRes.ok && !findingsRes.ok) {
        throw new Error("Both API calls failed");
      }

      setEvents(
        combined.length > 0
          ? combined.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
            )
          : MOCK_EVENTS,
      );
    } catch {
      setError("Could not reach API — showing demo data.");
      setEvents(MOCK_EVENTS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Filtered events
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    return events.filter((ev) => {
      if (dismissedIds.has(ev.id)) return false;
      if (filterSource !== "all" && ev.source !== filterSource) return false;
      if (filterSeverity !== "all" && ev.severity !== filterSeverity) return false;
      if (!isWithinRange(ev.timestamp, filterDateRange)) return false;
      if (
        filterTarget.trim() &&
        !(ev.target ?? "").toLowerCase().includes(filterTarget.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [events, dismissedIds, filterSource, filterSeverity, filterDateRange, filterTarget]);

  const summary = useMemo(() => {
    const critical = filtered.filter((event) => event.severity === "critical").length;
    const high = filtered.filter((event) => event.severity === "high").length;
    const sourceCounts = filtered.reduce<Record<EventSource, number>>(
      (accumulator, event) => {
        accumulator[event.source] += 1;
        return accumulator;
      },
      { web_scan: 0, agent_local: 0, api: 0, integration: 0, plugin: 0 },
    );
    const topSource = (Object.entries(sourceCounts).sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0] ?? "web_scan") as EventSource;
    const uniqueTargets = new Set(
      filtered.map((event) => event.target).filter(Boolean) as string[],
    );
    return {
      total: filtered.length,
      critical,
      high,
      topSource,
      uniqueTargets: uniqueTargets.size,
    };
  }, [filtered]);

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmicsec-timeline-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMobileListTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 0) {
      setPullStartY(event.touches[0].clientY);
    }
  };

  const handleMobileListTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartY === null) return;
    const nextDistance = Math.max(0, event.touches[0].clientY - pullStartY);
    setPullDistance(Math.min(nextDistance, 90));
  };

  const handleMobileListTouchEnd = () => {
    if (pullDistance > 70 && !isLoading) {
      setIsPullRefreshing(true);
      void fetchData().finally(() => setIsPullRefreshing(false));
    }
    setPullStartY(null);
    setPullDistance(0);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Clock className="h-6 w-6 text-cyan-400" />
              <h1 className="text-2xl font-bold text-slate-100">Event Timeline</h1>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Unified view of all security events across scans, agents, and integrations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void fetchData()}
              disabled={isLoading}
              className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </button>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
          <Filter className="h-4 w-4 shrink-0 text-slate-500" />

          {/* Source */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value as FilterSource)}
            aria-label="Filter by source"
            className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Sources</option>
            <option value="web_scan">Web Scan</option>
            <option value="agent_local">Agent</option>
            <option value="api">API</option>
            <option value="integration">Integration</option>
            <option value="plugin">Plugin</option>
          </select>

          {/* Severity */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
            aria-label="Filter by severity"
            className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>

          {/* Date range */}
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value as FilterDateRange)}
            aria-label="Filter by date range"
            className="min-h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Target search */}
          <div className="relative min-w-40 flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value)}
              placeholder="Filter by target…"
              className="min-h-10 w-full rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </div>

          <span className="ml-auto text-xs text-slate-500">
            {filtered.length} / {events.length} events
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Visible events</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{summary.total}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Critical / High</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {summary.critical} / {summary.high}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Top source</p>
            <p className="mt-1 text-lg font-semibold text-slate-100 capitalize">
              {SOURCE_LABELS[summary.topSource]}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Unique targets</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{summary.uniqueTargets}</p>
          </div>
        </div>

        {/* Timeline list */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <p className="text-sm">Loading events…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 py-20 text-center">
            <Clock className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm text-slate-500">No events match the current filters.</p>
          </div>
        ) : (
          <>
            <div
              className="-mx-1 md:hidden"
              onTouchStart={handleMobileListTouchStart}
              onTouchMove={handleMobileListTouchMove}
              onTouchEnd={handleMobileListTouchEnd}
            >
              {(pullDistance > 0 || isPullRefreshing) && (
                <div className="mb-2 px-1">
                  <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    {isPullRefreshing ? "Refreshing timeline…" : "Pull down to refresh"}
                  </div>
                </div>
              )}
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
                {filtered.map((ev) => (
                  <div
                    key={`mobile-${ev.id}`}
                    className="min-w-[84%] snap-start rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm transition-transform"
                    onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
                    onTouchEnd={(event) => {
                      if (touchStartX === null) return;
                      const deltaX = touchStartX - event.changedTouches[0].clientX;
                      if (deltaX > 60) setSwipedCardId(ev.id);
                      if (deltaX < -40) setSwipedCardId(null);
                      setTouchStartX(null);
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_BADGE[ev.source]}`}
                      >
                        {SOURCE_LABELS[ev.source]}
                      </span>
                      <span
                        className={`text-xs font-semibold capitalize ${SEVERITY_TEXT[ev.severity]}`}
                      >
                        {ev.severity}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {relativeTime(ev.timestamp)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-slate-200">{ev.title}</h3>
                    {ev.description && (
                      <p className="mt-1 text-xs text-slate-400">{ev.description}</p>
                    )}
                    {ev.target ? (
                      <span className="mt-2 inline-flex min-h-8 items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-300">
                        {ev.target}
                      </span>
                    ) : null}
                    <button
                      onClick={() => openEventContext(ev)}
                      className="mt-2 inline-flex min-h-8 items-center gap-1 rounded bg-slate-800 px-2 py-1 text-xs font-medium text-cyan-300 transition-colors hover:bg-slate-700"
                    >
                      {getEventContextLabel(ev)}
                    </button>
                    {swipedCardId === ev.id && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => navigate("/agents")}
                          className="min-h-8 rounded bg-cyan-500/20 px-2 py-1 text-[11px] font-medium text-cyan-300"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => setFilterSeverity("critical")}
                          className="min-h-8 rounded bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-300"
                        >
                          Flag
                        </button>
                        <button
                          onClick={() => {
                            setDismissedIds((previous) => new Set(previous).add(ev.id));
                            setSwipedCardId(null);
                          }}
                          className="min-h-8 rounded bg-rose-500/20 px-2 py-1 text-[11px] font-medium text-rose-300"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden space-y-0 md:block">
              {/* Vertical line */}
              <div className="absolute bottom-0 left-5.5 top-0 w-px bg-slate-800" />

              <ul className="space-y-1">
                {filtered.map((ev) => (
                  <li key={ev.id} className="relative flex gap-4 pb-4">
                    {/* Severity dot */}
                    <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
                      <span
                        className={`h-3 w-3 rounded-full ring-4 ring-slate-950 ${SEVERITY_DOT[ev.severity]}`}
                      />
                    </div>

                    {/* Card */}
                    <div className="flex-1 rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-slate-700">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Source badge */}
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ring-1 ${SOURCE_BADGE[ev.source]}`}
                          >
                            {SOURCE_LABELS[ev.source]}
                          </span>
                          {/* Severity label */}
                          <span
                            className={`text-xs font-semibold capitalize ${SEVERITY_TEXT[ev.severity]}`}
                          >
                            {ev.severity}
                          </span>
                        </div>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {relativeTime(ev.timestamp)}
                        </span>
                      </div>

                      <h3 className="mt-2 text-sm font-semibold text-slate-200">{ev.title}</h3>

                      {ev.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">{ev.description}</p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {ev.target ? (
                          <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-xs text-slate-300">
                            {ev.target}
                          </span>
                        ) : null}
                        {ev.scan_id ? (
                          <button
                            onClick={() => navigate(`/scans/${ev.scan_id}`)}
                            className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-cyan-500/30"
                          >
                            Scan
                          </button>
                        ) : null}
                        {getPluginTarget(ev) ? (
                          <button
                            onClick={() =>
                              navigate(`/plugins/${encodeURIComponent(getPluginTarget(ev) ?? "")}`)
                            }
                            className="inline-flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/30"
                          >
                            Plugin
                          </button>
                        ) : null}
                        <button
                          onClick={() => openEventContext(ev)}
                          className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs font-medium text-cyan-300 transition-colors hover:bg-slate-700"
                        >
                          {getEventContextLabel(ev)}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
};
