import { useState } from "react";
import { Globe, Download, ChevronDown, ChevronRight, Loader2, Search } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";

const API = "http://localhost:8000";

interface ReconResult {
  target: string;
  timestamp: number;
  dns?: { A?: string[]; AAAA?: string[]; MX?: string[]; NS?: string[]; TXT?: string[]; CNAME?: string[] };
  shodan?: { ip_str?: string; ports?: number[]; hostnames?: string[]; org?: string; country_name?: string };
  virustotal?: { positives?: number; total?: number; permalink?: string };
  subdomains?: string[];
  rdap?: { handle?: string; name?: string; type?: string; status?: string[] };
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
      const res = await fetch(`${API}/api/recon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            <CollapsiblePanel title="DNS Records" defaultOpen>
              {result.dns ? (
                <div className="space-y-2 text-sm">
                  {Object.entries(result.dns).map(([type, records]) =>
                    records && records.length > 0 ? (
                      <div key={type} className="flex gap-3">
                        <span className="w-10 flex-shrink-0 font-mono text-cyan-400">{type}</span>
                        <span className="text-slate-300">{records.join(", ")}</span>
                      </div>
                    ) : null,
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No DNS data returned.</p>
              )}
            </CollapsiblePanel>

            {/* Shodan */}
            <CollapsiblePanel title="Shodan Intel">
              {result.shodan ? (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["IP", result.shodan.ip_str],
                    ["Org", result.shodan.org],
                    ["Country", result.shodan.country_name],
                    ["Open Ports", result.shodan.ports?.join(", ")],
                    ["Hostnames", result.shodan.hostnames?.join(", ")],
                  ].map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <dt className="text-xs text-slate-500">{k}</dt>
                        <dd className="font-mono text-slate-300">{v}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">No Shodan data.</p>
              )}
            </CollapsiblePanel>

            {/* VirusTotal */}
            <CollapsiblePanel title="VirusTotal">
              {result.virustotal ? (
                <div className="text-sm">
                  <p className="text-slate-300">
                    Detections:{" "}
                    <span className={`font-semibold ${(result.virustotal.positives ?? 0) > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {result.virustotal.positives ?? 0} / {result.virustotal.total ?? 0}
                    </span>
                  </p>
                  {result.virustotal.permalink && (
                    <a
                      href={result.virustotal.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-xs text-blue-400 hover:underline"
                    >
                      View full report →
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No VirusTotal data.</p>
              )}
            </CollapsiblePanel>

            {/* Subdomains */}
            <CollapsiblePanel title={`Subdomains (${result.subdomains?.length ?? 0})`}>
              {result.subdomains && result.subdomains.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.subdomains.map((sub) => (
                    <span key={sub} className="rounded-md bg-slate-800 px-2.5 py-1 font-mono text-xs text-slate-300">
                      {sub}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No subdomains discovered.</p>
              )}
            </CollapsiblePanel>

            {/* RDAP */}
            <CollapsiblePanel title="RDAP Registration">
              {result.rdap ? (
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Handle", result.rdap.handle],
                    ["Name", result.rdap.name],
                    ["Type", result.rdap.type],
                    ["Status", result.rdap.status?.join(", ")],
                  ].map(([k, v]) =>
                    v ? (
                      <div key={k}>
                        <dt className="text-xs text-slate-500">{k}</dt>
                        <dd className="text-slate-300">{v}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
              ) : (
                <p className="text-sm text-slate-500">No RDAP data.</p>
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
