import { useState } from "react";
import { Globe, Download, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";

const API = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

/** Matches the actual recon service /recon response shape */
interface ReconResult {
  target: string;
  timestamp: string;
  /** dns.ips: resolved IP addresses; dns.errors: any resolution errors */
  dns: { ips: string[]; errors: string[] };
  /** Shodan lookup — disabled when SHODAN_API_KEY not set */
  shodan: { enabled: boolean; subdomains?: string[]; data_preview?: unknown[]; error?: string };
  /** VirusTotal lookup — disabled when VIRUSTOTAL_API_KEY not set */
  virustotal: { enabled: boolean; analysis_stats?: Record<string, number>; error?: string };
  /** crt.sh certificate transparency subdomains */
  crtsh: { enabled: boolean; subdomains?: string[]; error?: string };
  /** RDAP registration info */
  rdap: { enabled: boolean; handle?: string; status?: string[]; nameservers?: string[]; events?: unknown[]; error?: string };
  findings?: { source: string; summary: string }[];
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
        {open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
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
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-3 animate-pulse rounded bg-slate-800" style={{ width: `${60 + i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

export function ReconPage() {
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReconResult | null>(null);
  const addNotification = useNotificationStore((s) => s.addNotification);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/recon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ target: target.trim() }),
      });
      const data = (await res.json()) as ReconResult;
      setResult(data);
      addNotification({ type: "success", message: `Recon complete for ${target.trim()}` });
    } catch {
      addNotification({ type: "error", message: "Recon request failed. Check API connection." });
    } finally {
      setLoading(false);
    }
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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? "Running…" : "Run Recon"}
          </button>
        </form>

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
            <CollapsiblePanel title={`DNS Records${result.dns.ips.length > 0 ? ` (${result.dns.ips.length} IPs)` : ""}`} defaultOpen>
              {result.dns.ips.length > 0 ? (
                <div className="space-y-1 text-sm">
                  <p className="text-xs uppercase tracking-wide text-slate-500">A / AAAA Records</p>
                  <div className="flex flex-wrap gap-2">
                    {result.dns.ips.map((ip) => (
                      <span key={ip} className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-cyan-300">{ip}</span>
                    ))}
                  </div>
                  {result.dns.errors.length > 0 && (
                    <p className="mt-1 text-xs text-rose-400">Errors: {result.dns.errors.join("; ")}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  {result.dns.errors.length > 0 ? result.dns.errors.join("; ") : "No DNS records resolved."}
                </p>
              )}
            </CollapsiblePanel>

            {/* Shodan */}
            <CollapsiblePanel title="Shodan Intelligence">
              {!result.shodan.enabled ? (
                <p className="text-sm text-slate-500">Shodan not configured (SHODAN_API_KEY not set).</p>
              ) : result.shodan.error ? (
                <p className="text-sm text-rose-400">Error: {result.shodan.error}</p>
              ) : (
                <div className="space-y-2">
                  {result.shodan.subdomains && result.shodan.subdomains.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Subdomains via Shodan</p>
                      <div className="flex flex-wrap gap-2">
                        {result.shodan.subdomains.map((sub) => (
                          <span key={sub} className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-xs text-slate-300">{sub}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.shodan.data_preview && result.shodan.data_preview.length > 0 && (
                    <p className="text-xs text-slate-500">{result.shodan.data_preview.length} service record(s) found.</p>
                  )}
                </div>
              )}
            </CollapsiblePanel>

            {/* VirusTotal */}
            <CollapsiblePanel title="VirusTotal Analysis">
              {!result.virustotal.enabled ? (
                <p className="text-sm text-slate-500">VirusTotal not configured (VIRUSTOTAL_API_KEY not set).</p>
              ) : result.virustotal.error ? (
                <p className="text-sm text-rose-400">Error: {result.virustotal.error}</p>
              ) : result.virustotal.analysis_stats ? (
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  {Object.entries(result.virustotal.analysis_stats).map(([stat, count]) => (
                    <div key={stat} className="rounded-lg bg-slate-900 p-2 text-center">
                      <dt className="text-xs capitalize text-slate-500">{stat}</dt>
                      <dd className={`text-base font-bold ${stat === "malicious" && count > 0 ? "text-rose-400" : "text-slate-200"}`}>{count}</dd>
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
                        <span key={sub} className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300">{sub}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No subdomains found via certificate transparency logs.</p>
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
