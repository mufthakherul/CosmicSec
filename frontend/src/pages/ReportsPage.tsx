import { useEffect, useMemo, useState } from "react";
import { FileText, Download, Loader2, Calendar, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useNotificationStore } from "../store/notificationStore";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface Report {
  id: string;
  scan_id: string;
  format: string;
  status: "queued" | "generating" | "ready" | "failed";
  created_at: string;
  url?: string;
}

const FORMAT_OPTIONS = ["json", "html", "pdf"] as const;
type ReportFormat = (typeof FORMAT_OPTIONS)[number];

const STATUS_BADGE: Record<Report["status"], { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-slate-700 text-slate-300" },
  generating: { label: "Generating", className: "bg-blue-500/20 text-blue-400" },
  ready: { label: "Ready", className: "bg-emerald-500/20 text-emerald-400" },
  failed: { label: "Failed", className: "bg-rose-500/20 text-rose-400" },
};

export function ReportsPage() {
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [scanId, setScanId] = useState("");
  const [format, setFormat] = useState<ReportFormat>("json");
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [animateCharts, setAnimateCharts] = useState(false);

  const reportHealth = useMemo(() => {
    const total = reports.length || 1;
    const ready = reports.filter((report) => report.status === "ready").length;
    const generatingCount = reports.filter((report) => report.status === "generating").length;
    const queued = reports.filter((report) => report.status === "queued").length;
    const failed = reports.filter((report) => report.status === "failed").length;
    return [
      { label: "Ready", count: ready, pct: Math.round((ready / total) * 100), color: "bg-emerald-500" },
      { label: "Generating", count: generatingCount, pct: Math.round((generatingCount / total) * 100), color: "bg-blue-500" },
      { label: "Queued", count: queued, pct: Math.round((queued / total) * 100), color: "bg-slate-500" },
      { label: "Failed", count: failed, pct: Math.round((failed / total) * 100), color: "bg-rose-500" },
    ];
  }, [reports]);

  useEffect(() => {
    setAnimateCharts(false);
    const timer = window.setTimeout(() => setAnimateCharts(true), 50);
    return () => window.clearTimeout(timer);
  }, [reports.length]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanId.trim()) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ scan_id: scanId.trim(), format }),
      });

      interface ReportResponse { report_id?: string; id?: string; status?: string }
      const data = (await res.json()) as ReportResponse;
      const newReport: Report = {
        id: data.report_id ?? data.id ?? `r-${Date.now()}`,
        scan_id: scanId.trim(),
        format,
        status: "queued",
        created_at: new Date().toISOString(),
      };
      setReports((prev) => [newReport, ...prev]);
      setScanId("");
      addNotification({ type: "success", message: `Report generation queued (${format.toUpperCase()})` });
    } catch {
      addNotification({ type: "error", message: "Failed to generate report." });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/reports/${report.id}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cosmicsec-report-${report.scan_id}.${report.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      addNotification({ type: "error", message: "Failed to download report." });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-slate-100">Reports</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Generate PDF, HTML, or JSON security reports from scan results.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Generate form */}
          <section className="lg:col-span-2">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Generate Report</h2>
              <form onSubmit={(e) => void handleGenerate(e)} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-slate-400">Scan ID</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={scanId}
                      onChange={(e) => setScanId(e.target.value)}
                      placeholder="Enter scan ID…"
                      className="input-glow w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs text-slate-400">Format</label>
                  <div className="flex gap-2">
                    {FORMAT_OPTIONS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFormat(f)}
                        className={[
                          "rounded-md px-3 py-1.5 text-xs font-medium uppercase transition-colors",
                          format === f
                            ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700",
                        ].join(" ")}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={generating || !scanId.trim()}
                  className="ripple flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  {generating ? "Queuing…" : "Generate Report"}
                </button>
              </form>

              <div className="mt-5 border-t border-slate-800 pt-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Report Health</h3>
                <div className="space-y-2">
                  {reportHealth.map((item) => (
                    <div key={item.label}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                        <span>{item.label}</span>
                        <span>
                          {item.count} ({item.pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${item.color}`}
                          style={{ width: `${animateCharts ? item.pct : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Reports list */}
          <section className="lg:col-span-3">
            <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent Reports</h2>
              {reports.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No reports generated yet. Enter a scan ID above to create one.
                </div>
              ) : (
                <ul className="space-y-2">
                  {reports.map((report) => {
                    const badge = STATUS_BADGE[report.status];
                    return (
                      <li
                        key={report.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-200">
                            Scan: <span className="font-mono">{report.scan_id}</span>
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs uppercase text-slate-400">
                              {report.format}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="h-3 w-3" />
                              {new Date(report.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3 flex flex-shrink-0 items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                          {report.status === "ready" && (
                            <button
                              onClick={() => void handleDownload(report)}
                              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400"
                              aria-label="Download report"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {report.status === "failed" && (
                            <AlertTriangle className="h-4 w-4 text-rose-400" />
                          )}
                          {report.status === "ready" && (
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
