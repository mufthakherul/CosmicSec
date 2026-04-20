import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Globe, Download, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import {
  shouldUseTorForTarget,
  useNetworkPreferencesStore,
  type TorMode,
} from "../store/networkPreferencesStore";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

/** Matches the actual recon service /recon response shape */
interface ReconResult {
  target: string;
  timestamp: string;
  status?: string;
  reason?: string;
  /** dns.ips: resolved IP addresses; dns.errors: any resolution errors */
  dns: { ips: string[]; errors: string[] };
  /** Shodan lookup — disabled when SHODAN_API_KEY not set */
  shodan: { enabled: boolean; subdomains?: string[]; data_preview?: unknown[]; error?: string };
  /** VirusTotal lookup — disabled when VIRUSTOTAL_API_KEY not set */
  virustotal: { enabled: boolean; analysis_stats?: Record<string, number>; error?: string };
  /** crt.sh certificate transparency subdomains */
  crtsh: { enabled: boolean; subdomains?: string[]; error?: string };
  /** RDAP registration info */
  rdap: {
    enabled: boolean;
    handle?: string;
    status?: string[];
    nameservers?: string[];
    events?: unknown[];
    error?: string;
  };
  findings?: { source: string; summary: string }[];
}

function normalizeReconResult(payload: unknown, fallbackTarget: string): ReconResult {
  const raw = (payload ?? {}) as Partial<ReconResult>;
  return {
    target: raw.target ?? fallbackTarget,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    status: raw.status,
    reason: raw.reason,
    dns: {
      ips: Array.isArray(raw.dns?.ips) ? raw.dns.ips : [],
      errors: Array.isArray(raw.dns?.errors) ? raw.dns.errors : [],
    },
    shodan: {
      enabled: Boolean(raw.shodan?.enabled),
      subdomains: Array.isArray(raw.shodan?.subdomains) ? raw.shodan.subdomains : [],
      data_preview: Array.isArray(raw.shodan?.data_preview) ? raw.shodan.data_preview : [],
      error: raw.shodan?.error,
    },
    virustotal: {
      enabled: Boolean(raw.virustotal?.enabled),
      analysis_stats:
        raw.virustotal?.analysis_stats && typeof raw.virustotal.analysis_stats === "object"
          ? raw.virustotal.analysis_stats
          : {},
      error: raw.virustotal?.error,
    },
    crtsh: {
      enabled: Boolean(raw.crtsh?.enabled),
      subdomains: Array.isArray(raw.crtsh?.subdomains) ? raw.crtsh.subdomains : [],
      error: raw.crtsh?.error,
    },
    rdap: {
      enabled: Boolean(raw.rdap?.enabled),
      handle: raw.rdap?.handle,
      status: Array.isArray(raw.rdap?.status) ? raw.rdap.status : [],
      nameservers: Array.isArray(raw.rdap?.nameservers) ? raw.rdap.nameservers : [],
      events: Array.isArray(raw.rdap?.events) ? raw.rdap.events : [],
      error: raw.rdap?.error,
    },
    findings: Array.isArray(raw.findings) ? raw.findings : [],
  };
}

function CollapsiblePanel({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-800 bg-white/5 backdrop-blur-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-300 hover:text-slate-100"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500" />
        )}
      </button>
      {open && <div className="border-t border-slate-800 px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function SkeletonPanel() {
  return (
    <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
      <div className="mb-3 h-4 w-1/3 animate-pulse rounded bg-slate-700" />
      <div className="space-y-2">
        {["w-[70%]", "w-[80%]", "w-[90%]"].map((widthClass) => (
          <div
            key={widthClass}
            className={`h-3 animate-pulse rounded bg-slate-800 ${widthClass}`}
          />
        ))}
      </div>
    </div>
  );
}

export function ReconPage() {
  const [searchParams] = useSearchParams();
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [useProxyPool, setUseProxyPool] = useState(false);
  const [proxyUrl, setProxyUrl] = useState("");
  const [rotateIdentity, setRotateIdentity] = useState(false);
  const [clientProfile, setClientProfile] = useState<
    "desktop_chrome" | "desktop_firefox" | "android_mobile" | "ios_safari"
  >("desktop_chrome");
  const torMode = useNetworkPreferencesStore((s) => s.torMode);
  const setTorMode = useNetworkPreferencesStore((s) => s.setTorMode);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestTimeoutRef = useRef<number | null>(null);
  const presetTorMode: Record<string, TorMode> = {
    always: "enabled",
    smart: "auto",
    never: "disabled",
  };

  const clearActiveRequest = () => {
    if (requestTimeoutRef.current !== null) {
      window.clearTimeout(requestTimeoutRef.current);
      requestTimeoutRef.current = null;
    }
    activeRequestRef.current = null;
  };

  useEffect(() => {
    return () => {
      activeRequestRef.current?.abort();
      clearActiveRequest();
    };
  }, []);

  useEffect(() => {
    const preset = searchParams.get("preset");
    if (!preset) return;

    if (preset === "onion-stealth") {
      setShowAdvanced(true);
      setUseProxyPool(true);
      setRotateIdentity(true);
      setClientProfile("desktop_firefox");
      setTorMode(presetTorMode.always);
      setTarget((current) => current || "exampleonion.org");
      return;
    }

    if (preset === "osint-surface") {
      setShowAdvanced(true);
      setUseProxyPool(false);
      setRotateIdentity(false);
      setClientProfile("desktop_chrome");
      setTorMode(presetTorMode.smart);
      setTarget((current) => current || "example.com");
      return;
    }

    if (preset === "ctf-recon") {
      setShowAdvanced(true);
      setUseProxyPool(false);
      setRotateIdentity(false);
      setClientProfile("desktop_chrome");
      setTorMode(presetTorMode.never);
      setTarget((current) => current || "ctf-target.local");
    }
  }, [searchParams, setTorMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    activeRequestRef.current?.abort();
    clearActiveRequest();

    setLoading(true);
    setResult(null);
    try {
      const controller = new AbortController();
      activeRequestRef.current = controller;
      requestTimeoutRef.current = window.setTimeout(() => controller.abort(), 25000);
      const token = localStorage.getItem("cosmicsec_token");
      const trimmedTarget = target.trim();
      const shouldUseTor = shouldUseTorForTarget(trimmedTarget, torMode);
      const res = await fetch(`${API}/api/recon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          target: trimmedTarget,
          use_proxy_pool: useProxyPool,
          proxy_url: proxyUrl.trim() || undefined,
          rotate_identity: rotateIdentity,
          client_profile: clientProfile,
          use_tor: shouldUseTor,
          tor_mode: torMode,
        }),
        signal: controller.signal,
      });

      clearActiveRequest();
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Recon request failed with status ${res.status}`);
      }

      const data = (await res.json()) as unknown;
      const rejected =
        typeof data === "object" &&
        data !== null &&
        (data as { status?: string }).status === "rejected";
      if (rejected) {
        const reason =
          (data as { reason?: string }).reason ?? "Recon request was rejected by server policy.";
        addNotification({ type: "error", message: reason });
        setResult(normalizeReconResult(data, trimmedTarget));
        return;
      }
      setResult(normalizeReconResult(data, trimmedTarget));
      addNotification({ type: "success", message: `Recon complete for ${trimmedTarget}` });
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? "Recon request cancelled or timed out."
          : "Recon request failed. Check API connection.";
      addNotification({ type: "error", message });
    } finally {
      clearActiveRequest();
      setLoading(false);
    }
  };

  const handleCancel = () => {
    activeRequestRef.current?.abort();
    clearActiveRequest();
    setLoading(false);
    addNotification({ type: "warning", message: "Recon request cancelled." });
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recon-${result.target}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <Globe className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-slate-100">OSINT & Recon</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            DNS, Shodan, VirusTotal, subdomain enumeration, and RDAP in a single pipeline.
          </p>
        </header>

        {/* Search bar */}
        <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Target domain or IP…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Running…" : "Run Recon"}
          </button>
          {loading ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/20"
            >
              Cancel
            </button>
          ) : null}
        </form>

        <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between text-left text-xs font-semibold uppercase tracking-wide text-slate-300"
          >
            Advanced Network Strategy
            <span className="text-slate-500">{showAdvanced ? "Hide" : "Show"}</span>
          </button>

          {showAdvanced ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={useProxyPool}
                  onChange={(e) => setUseProxyPool(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Use backend proxy pool
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rotateIdentity}
                  onChange={(e) => setRotateIdentity(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                Rotate identity (proxy/user-agent)
              </label>

              <label className="text-xs text-slate-400">
                Global Tor mode
                <select
                  value={torMode}
                  onChange={(e) => setTorMode(e.target.value as "enabled" | "disabled" | "auto")}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                >
                  <option value="disabled">Disabled (never route through Tor)</option>
                  <option value="auto">Auto-detect (.onion routes via Tor)</option>
                  <option value="enabled">Enabled (force Tor for recon egress)</option>
                </select>
              </label>

              <label className="text-xs text-slate-400">
                Client profile
                <select
                  value={clientProfile}
                  onChange={(e) =>
                    setClientProfile(
                      e.target.value as
                        | "desktop_chrome"
                        | "desktop_firefox"
                        | "android_mobile"
                        | "ios_safari",
                    )
                  }
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                >
                  <option value="desktop_chrome">Desktop Chrome</option>
                  <option value="desktop_firefox">Desktop Firefox</option>
                  <option value="android_mobile">Android Mobile</option>
                  <option value="ios_safari">iOS Safari</option>
                </select>
              </label>

              <label className="col-span-full text-xs text-slate-400">
                Custom proxy URL (optional)
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="http://user:pass@proxy-host:port or socks5://host:9050"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-200"
                />
              </label>

              <p className="col-span-full text-[11px] text-slate-500">
                Use only on assets you are authorized to assess. In Auto mode, onion targets route
                through Tor automatically.
              </p>
            </div>
          ) : null}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonPanel key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {result && !loading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Results for <span className="font-semibold text-slate-200">{result.target}</span>
                <span className="ml-2 text-xs text-slate-600">{result.timestamp}</span>
              </p>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </button>
            </div>

            {/* DNS */}
            <CollapsiblePanel
              title={`DNS Records${result.dns.ips.length > 0 ? ` (${result.dns.ips.length} IPs)` : ""}`}
              defaultOpen
            >
              {result.dns.ips.length > 0 ? (
                <div className="space-y-1 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">A / AAAA Records</p>
                  <div className="flex flex-wrap gap-2">
                    {result.dns.ips.map((ip) => (
                      <span
                        key={ip}
                        className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-cyan-300"
                      >
                        {ip}
                      </span>
                    ))}
                  </div>
                  {result.dns.errors.length > 0 && (
                    <p className="mt-1 text-xs text-rose-400">
                      Errors: {result.dns.errors.join("; ")}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {result.dns.errors.length > 0
                    ? result.dns.errors.join("; ")
                    : "No DNS records resolved."}
                </p>
              )}
            </CollapsiblePanel>

            {/* Shodan */}
            <CollapsiblePanel title="Shodan Intelligence">
              {!result.shodan.enabled ? (
                <p className="text-sm text-slate-500">
                  Shodan not configured (SHODAN_API_KEY not set).
                </p>
              ) : result.shodan.error ? (
                <p className="text-sm text-rose-400">Error: {result.shodan.error}</p>
              ) : (
                <div className="space-y-2">
                  {result.shodan.subdomains && result.shodan.subdomains.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                        Subdomains via Shodan
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {result.shodan.subdomains.map((sub) => (
                          <span
                            key={sub}
                            className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.shodan.data_preview && result.shodan.data_preview.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {result.shodan.data_preview.length} service record(s) found.
                    </p>
                  )}
                </div>
              )}
            </CollapsiblePanel>

            {/* VirusTotal */}
            <CollapsiblePanel title="VirusTotal Analysis">
              {!result.virustotal.enabled ? (
                <p className="text-sm text-slate-500">
                  VirusTotal not configured (VIRUSTOTAL_API_KEY not set).
                </p>
              ) : result.virustotal.error ? (
                <p className="text-sm text-rose-400">Error: {result.virustotal.error}</p>
              ) : result.virustotal.analysis_stats ? (
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  {Object.entries(result.virustotal.analysis_stats).map(([stat, count]) => (
                    <div key={stat} className="rounded-lg bg-slate-900 p-2 text-center">
                      <dt className="text-xs capitalize text-slate-500">{stat}</dt>
                      <dd
                        className={`text-base font-bold ${stat === "malicious" && count > 0 ? "text-rose-400" : "text-slate-200"}`}
                      >
                        {count}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">No analysis data available.</p>
              )}
            </CollapsiblePanel>

            {/* Subdomains (crt.sh) */}
            {(() => {
              const subs = result.crtsh.subdomains ?? [];
              return (
                <CollapsiblePanel title={`Certificate Transparency Subdomains (${subs.length})`}>
                  {!result.crtsh.enabled ? (
                    <p className="text-sm text-slate-500">crt.sh lookup unavailable.</p>
                  ) : result.crtsh.error ? (
                    <p className="text-sm text-rose-400">Error: {result.crtsh.error}</p>
                  ) : subs.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {subs.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      No subdomains found via certificate transparency logs.
                    </p>
                  )}
                </CollapsiblePanel>
              );
            })()}

            {/* RDAP */}
            <CollapsiblePanel title="RDAP Registration">
              {!result.rdap.enabled ? (
                <p className="text-sm text-slate-500">RDAP lookup unavailable.</p>
              ) : result.rdap.error ? (
                <p className="text-sm text-rose-400">Error: {result.rdap.error}</p>
              ) : (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Handle", result.rdap.handle],
                    ["Status", result.rdap.status?.join(", ")],
                    ["Nameservers", result.rdap.nameservers?.join(", ")],
                  ].map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <dt className="text-xs text-slate-500">{k}</dt>
                        <dd className="text-slate-300">{v}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              )}
            </CollapsiblePanel>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-slate-700" />
            <p className="text-sm text-slate-500">Enter a target above to begin reconnaissance.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
