import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radar, Clock, CheckCircle, AlertCircle, Loader2, Play } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { Pagination } from "../components/Pagination";
import { useScanStore, type Scan, type ScanStatus } from "../store/scanStore";
import {
  shouldUseTorForTarget,
  useNetworkPreferencesStore,
} from "../store/networkPreferencesStore";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

const TOOLS = [
  "nmap",
  "nikto",
  "nuclei",
  "gobuster",
  "sqlmap",
  "ffuf",
  "masscan",
  "zap",
  "trivy",
] as const;
type Tool = (typeof TOOLS)[number];

const STATUS_BADGE: Record<
  ScanStatus,
  { label: string; className: string; icon: React.ElementType }
> = {
  pending: { label: "Pending", className: "bg-slate-700 text-slate-300", icon: Clock },
  running: { label: "Running", className: "bg-blue-500/20 text-blue-400", icon: Loader2 },
  completed: {
    label: "Complete",
    className: "bg-emerald-500/20 text-emerald-400",
    icon: CheckCircle,
  },
  failed: { label: "Failed", className: "bg-rose-500/20 text-rose-400", icon: AlertCircle },
};

const SOURCE_BADGE: Record<string, string> = {
  web_scan: "bg-blue-500/10 text-blue-300 ring-blue-500/30",
  agent_local: "bg-cyan-500/10 text-cyan-300 ring-cyan-500/30",
  offline_sync: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
};

/** Map UI scan type + selected tools to ScanConfig.scan_types array. */
function toScanTypes(scanType: "quick" | "full" | "custom", tools: Set<Tool>): string[] {
  if (scanType === "quick") return ["network", "web"];
  if (scanType === "full") return ["network", "web", "api", "cloud", "container"];
  // custom — derive from selected tools
  const types = new Set<string>();
  if (tools.has("nmap")) types.add("network");
  if (tools.has("nikto") || tools.has("nuclei") || tools.has("sqlmap")) types.add("web");
  if (tools.has("gobuster")) {
    types.add("web");
    types.add("api");
  }
  return types.size > 0 ? [...types] : ["network"];
}

export function ScanPage() {
  const navigate = useNavigate();
  const { scans, addScan, setScans } = useScanStore();
  const torMode = useNetworkPreferencesStore((s) => s.torMode);
  const setTorMode = useNetworkPreferencesStore((s) => s.setTorMode);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [target, setTarget] = useState("");
  const [scanType, setScanType] = useState<"quick" | "full" | "custom">("quick");
  const [selectedTools, setSelectedTools] = useState<Set<Tool>>(new Set(["nmap", "nuclei"]));
  const [submitting, setSubmitting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(300);
  const [scanDepth, setScanDepth] = useState<number>(2);
  const [scanProfile, setScanProfile] = useState<"balanced" | "aggressive" | "stealth">("balanced");
  const [maxRequestsPerMinute, setMaxRequestsPerMinute] = useState(180);
  const [enableAiPrioritization, setEnableAiPrioritization] = useState(true);
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [swipedScanId, setSwipedScanId] = useState<string | null>(null);
  const [dismissedScanIds, setDismissedScanIds] = useState<Set<string>>(new Set());
  const [scanPage, setScanPage] = useState(1);
  const SCANS_PER_PAGE = 8;

  const toggleTool = (tool: Tool) =>
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) {
        next.delete(tool);
      } else {
        next.add(tool);
      }
      return next;
    });

  const visibleScans = useMemo(
    () => scans.filter((scan) => !dismissedScanIds.has(scan.id)),
    [dismissedScanIds, scans],
  );
  const scanPageCount = Math.max(1, Math.ceil(visibleScans.length / SCANS_PER_PAGE));
  const pagedScans = useMemo(
    () => visibleScans.slice((scanPage - 1) * SCANS_PER_PAGE, scanPage * SCANS_PER_PAGE),
    [scanPage, visibleScans],
  );

  useEffect(() => {
    setScanPage((page) => Math.min(page, Math.max(1, Math.ceil(visibleScans.length / SCANS_PER_PAGE))));
  }, [visibleScans.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const trimmedTarget = target.trim();
      const shouldUseTor = shouldUseTorForTarget(trimmedTarget, torMode);
      const res = await fetch(`${API}/api/scans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target: trimmedTarget,
          scan_types: toScanTypes(scanType, selectedTools),
          depth:
            scanType === "quick"
              ? Math.min(scanDepth, 1)
              : scanType === "full"
                ? Math.max(scanDepth, 3)
                : scanDepth,
          timeout: timeoutSeconds,
          options: {
            tools: Array.from(selectedTools),
            profile: scanProfile,
            max_requests_per_minute: maxRequestsPerMinute,
            ai_prioritization: enableAiPrioritization,
            use_tor: shouldUseTor,
            tor_mode: torMode,
          },
        }),
      });

      const data = (await res.json()) as { id?: string; scan_id?: string };
      const id = data.id ?? data.scan_id ?? `local-${Date.now()}`;

      const newScan: Scan = {
        id,
        target: trimmedTarget,
        tool: Array.from(selectedTools).join(", "),
        status: "pending",
        progress: 0,
        findings: [],
        createdAt: new Date().toISOString(),
        findingsCount: 0,
        severityBreakdown: {},
        source: "web_scan",
      };
      addScan(newScan);
      addNotification({ type: "success", message: `Scan queued for ${trimmedTarget}` });
      void navigate(`/scans/${id}`);
    } catch {
      addNotification({
        type: "error",
        message: "Failed to start scan. Check the API connection.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const refreshScans = async () => {
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/scans`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Failed to refresh scans");
      const payload = (await res.json()) as Array<{
        id?: string;
        target?: string;
        scan_types?: string[];
        source?: string;
        findings_count?: number;
        severity_breakdown?: Record<string, number>;
        status?: ScanStatus;
        progress?: number;
        created_at?: string;
      }>;
      if (!Array.isArray(payload)) return;
      const mapped: Scan[] = payload.map((item) => ({
        id: item.id ?? `scan-${Date.now()}`,
        target: item.target ?? "unknown",
        tool: item.scan_types && item.scan_types.length > 0 ? item.scan_types.join(", ") : "remote",
        source: item.source ?? "web_scan",
        status: (item.status ?? "pending") as ScanStatus,
        progress:
          typeof item.progress === "number"
            ? item.progress
            : item.status === "completed"
              ? 100
              : item.status === "running"
                ? 60
                : 0,
        findings: [],
              findingsCount: typeof item.findings_count === "number" ? item.findings_count : 0,
              severityBreakdown: item.severity_breakdown ?? {},
        createdAt: item.created_at ?? new Date().toISOString(),
      }));
      setScans(mapped);
    } catch {
      addNotification({ type: "warning", message: "Scan refresh unavailable right now." });
    } finally {
      setIsRefreshing(false);
    }
  };

  const onRecentTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY <= 0) {
      setPullStartY(event.touches[0].clientY);
    }
  };
  const onRecentTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (pullStartY === null) return;
    const nextDistance = Math.max(0, event.touches[0].clientY - pullStartY);
    setPullDistance(Math.min(nextDistance, 90));
  };
  const onRecentTouchEnd = () => {
    if (pullDistance > 70 && !isRefreshing) {
      void refreshScans();
    }
    setPullStartY(null);
    setPullDistance(0);
  };

  useEffect(() => {
    void refreshScans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <Radar className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-100">Scans</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Launch security scans against targets using integrated tooling.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Launch form */}
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                New Scan
              </h2>
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Target (URL or IP)</label>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="e.g. 192.168.1.1 or https://example.com"
                    className="input-glow w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Scan Type</label>
                  <select
                    value={scanType}
                    onChange={(e) => setScanType(e.target.value as typeof scanType)}
                    aria-label="Scan type"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
                  >
                    <option value="quick">Quick Scan</option>
                    <option value="full">Full Scan</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-slate-400">Tools</label>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                    {TOOLS.map((tool) => (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleTool(tool)}
                        className={[
                          "min-h-10 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                          selectedTools.has(tool)
                            ? "bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                        ].join(" ")}
                      >
                        {tool}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
                  >
                    Advanced Options
                    <span className="text-slate-500">{showAdvanced ? "Hide" : "Show"}</span>
                  </button>

                  {showAdvanced ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <label className="text-xs text-slate-400">
                        Timeout (seconds)
                        <input
                          type="number"
                          min={30}
                          max={1800}
                          value={timeoutSeconds}
                          onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 300)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        Scan depth
                        <input
                          type="number"
                          min={1}
                          max={6}
                          value={scanDepth}
                          onChange={(e) => setScanDepth(Number(e.target.value) || 2)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        Scan profile
                        <select
                          value={scanProfile}
                          onChange={(e) => setScanProfile(e.target.value as typeof scanProfile)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                        >
                          <option value="balanced">Balanced</option>
                          <option value="aggressive">Aggressive</option>
                          <option value="stealth">Stealth</option>
                        </select>
                      </label>
                      <label className="text-xs text-slate-400">
                        Max requests / min
                        <input
                          type="number"
                          min={10}
                          max={2000}
                          value={maxRequestsPerMinute}
                          onChange={(e) => setMaxRequestsPerMinute(Number(e.target.value) || 180)}
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                        />
                      </label>
                      <label className="col-span-full flex items-center gap-2 text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={enableAiPrioritization}
                          onChange={(e) => setEnableAiPrioritization(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                        />
                        Enable AI prioritization of findings
                      </label>

                      <label className="col-span-full text-xs text-slate-400">
                        Global Tor mode
                        <select
                          value={torMode}
                          onChange={(e) =>
                            setTorMode(e.target.value as "enabled" | "disabled" | "auto")
                          }
                          className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                        >
                          <option value="disabled">Disabled (never route through Tor)</option>
                          <option value="auto">Auto-detect (.onion routes via Tor)</option>
                          <option value="enabled">Enabled (force Tor for scan egress)</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !target.trim()}
                  className="ripple flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {submitting ? "Starting…" : "Launch Scan"}
                </button>
              </form>
            </div>
          </section>

          {/* Recent scans */}
          <section className="lg:col-span-3">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Recent Scans
              </h2>
              {scans.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No scans yet. Launch one to get started.
                </div>
              ) : (
                <div
                  className="space-y-2"
                  onTouchStart={onRecentTouchStart}
                  onTouchMove={onRecentTouchMove}
                  onTouchEnd={onRecentTouchEnd}
                >
                  {(pullDistance > 0 || isRefreshing) && (
                    <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                      {isRefreshing ? "Refreshing scans…" : "Pull down to refresh scans"}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{visibleScans.length} visible scans</span>
                    <span>Page {scanPage} of {scanPageCount}</span>
                  </div>
                  <ul className="space-y-2">
                    {pagedScans.map((scan) => {
                      const badge = STATUS_BADGE[scan.status];
                      const BadgeIcon = badge.icon;
                      return (
                        <li key={scan.id}>
                          <a
                            href={`/scans/${scan.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              void navigate(`/scans/${scan.id}`);
                            }}
                            className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:border-slate-700"
                            onTouchStart={(event) => setTouchStartX(event.touches[0].clientX)}
                            onTouchEnd={(event) => {
                              if (touchStartX === null) return;
                              const deltaX = touchStartX - event.changedTouches[0].clientX;
                              if (deltaX > 60) setSwipedScanId(scan.id);
                              if (deltaX < -40) setSwipedScanId(null);
                              setTouchStartX(null);
                            }}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-200">
                                {scan.target}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {scan.tool} · {new Date(scan.createdAt).toLocaleString()}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`rounded px-2 py-0.5 text-[10px] font-medium ring-1 ${SOURCE_BADGE[scan.source ?? ""] ?? "bg-slate-700/50 text-slate-300 ring-slate-600"}`}
                                >
                                  {(scan.source ?? "web_scan").replace("_", " ")}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {scan.findingsCount ?? scan.findings.length} finding(s)
                                </span>
                              </div>
                            </div>
                            <span
                              className={`ml-3 flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                            >
                              <BadgeIcon
                                className={`h-3 w-3 ${scan.status === "running" ? "animate-spin" : ""}`}
                              />
                              {badge.label}
                            </span>
                          </a>
                          {swipedScanId === scan.id && (
                            <div className="mt-1 grid grid-cols-3 gap-2">
                              <button
                                onClick={() => void navigate(`/scans/${scan.id}`)}
                                className="min-h-8 rounded bg-cyan-500/20 px-2 py-1 text-[11px] font-medium text-cyan-300"
                              >
                                Open
                              </button>
                              <button
                                onClick={() => void refreshScans()}
                                className="min-h-8 rounded bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-300"
                              >
                                Refresh
                              </button>
                              <button
                                onClick={() => {
                                  setDismissedScanIds((previous) => new Set(previous).add(scan.id));
                                  setSwipedScanId(null);
                                }}
                                className="min-h-8 rounded bg-rose-500/20 px-2 py-1 text-[11px] font-medium text-rose-300"
                              >
                                Dismiss
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="pt-2">
                    <Pagination page={scanPage} totalPages={scanPageCount} onPageChange={setScanPage} />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
