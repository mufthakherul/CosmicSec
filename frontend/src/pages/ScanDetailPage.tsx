import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Download,
  Info,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useScanStore, type Finding, type FindingSeverity } from "../store/scanStore";
import { useScanStream } from "../hooks/useScanStream";

const API = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

const SEV_STYLES: Record<FindingSeverity, { label: string; className: string; icon: React.ElementType }> = {
  critical: { label: "Critical", className: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldAlert },
  high: { label: "High", className: "bg-rose-500/20 text-rose-400 border-rose-500/30", icon: AlertCircle },
  medium: { label: "Medium", className: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertTriangle },
  low: { label: "Low", className: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Info },
  info: { label: "Info", className: "bg-slate-600/40 text-slate-400 border-slate-600/30", icon: Info },
};

function FindingCard({ finding }: { finding: Finding }) {
  const sev = SEV_STYLES[finding.severity];
  const SevIcon = sev.icon;
  return (
    <div className={`rounded-lg border ${sev.className} bg-white/5 p-4 backdrop-blur-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <SevIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm font-medium text-slate-200">{finding.title}</p>
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${sev.className}`}>{sev.label}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{finding.description}</p>
      {finding.evidence && (
        <pre className="mt-2 overflow-x-auto rounded bg-slate-900 p-2 text-xs text-slate-400">{finding.evidence}</pre>
      )}
      <p className="mt-2 text-xs text-slate-600">Tool: {finding.tool} · {finding.target}</p>
    </div>
  );
}

export function ScanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { scans, setActiveScan } = useScanStore();

  useScanStream(id);

  const scan = scans.find((s) => s.id === id);

  useEffect(() => {
    if (scan) setActiveScan(scan);
    return () => setActiveScan(null);
  }, [scan, setActiveScan]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ scan_id: id, format: "json" }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `scan-${id}-report.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — no notification store imported here for brevity
    }
  };

  if (!scan) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm">Loading scan details…</p>
        </div>
      </AppLayout>
    );
  }

  const criticalCount = scan.findings.filter((f) => f.severity === "critical").length;
  const highCount = scan.findings.filter((f) => f.severity === "high").length;
  const isRunning = scan.status === "running";
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Back + header */}
        <div className="flex flex-wrap items-start gap-4">
          <button
            onClick={() => void navigate("/scans")}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scans
          </button>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{scan.target}</h1>
            <p className="mt-1 text-sm text-slate-500">
              Scan ID: <span className="font-mono text-slate-400">{scan.id}</span> · Tools: {scan.tool}
            </p>
          </div>
          <button
            onClick={() => void handleExport()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </header>

        {/* Status cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Status", value: scan.status.toUpperCase() },
            { label: "Findings", value: String(scan.findings.length) },
            { label: "Critical", value: String(criticalCount) },
            { label: "High", value: String(highCount) },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1.5 text-lg font-semibold text-slate-100">{value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              {isRunning && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
              {scan.status === "completed" && <CheckCircle className="h-4 w-4 text-emerald-400" />}
              {scan.status === "failed" && <AlertCircle className="h-4 w-4 text-rose-400" />}
              {scan.status === "pending" && <Clock className="h-4 w-4 text-slate-400" />}
              <span className="capitalize">{scan.status}</span>
            </div>
            <span className="font-mono text-slate-500">{scan.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                scan.status === "failed" ? "bg-rose-500" : "bg-cyan-500"
              }`}
              style={{ width: `${scan.progress}%` }}
            />
          </div>
        </div>

        {/* Findings */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Findings ({scan.findings.length})
          </h2>
          {scan.findings.length === 0 ? (
            <div className="rounded-xl border border-slate-800 bg-white/5 py-12 text-center text-sm text-slate-500 backdrop-blur-sm">
              {isRunning ? "Waiting for findings…" : "No findings recorded."}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {scan.findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
