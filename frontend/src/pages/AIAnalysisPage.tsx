import { useState } from "react";
import { Brain, Loader2, Shield, Zap, AlertTriangle, CheckCircle, ChevronRight } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useScanStore } from "../store/scanStore";
import { useNotificationStore } from "../store/notificationStore";

const API = "http://localhost:8000";

interface MitreMapping {
  technique_id: string;
  technique_name: string;
  tactic: string;
}

interface AnalysisResult {
  analysis_id: string;
  risk_score: number;
  risk_level: string;
  summary: string;
  mitre_mappings: MitreMapping[];
  recommendations: string[];
  confidence: number;
}

/* SVG risk gauge */
function RiskGauge({ score }: { score: number }) {
  const r = 54;
  const cx = 64;
  const cy = 64;
  const circumference = 2 * Math.PI * r;
  const arc = circumference * 0.75;
  const filled = arc * (score / 100);

  const color =
    score >= 80 ? "#f43f5e" : score >= 60 ? "#f97316" : score >= 40 ? "#facc15" : "#22d3ee";

  return (
    <svg viewBox="0 0 128 128" className="h-36 w-36">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference * 0.125}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" fill="#f1f5f9" fontSize="24" fontWeight="700">
        {score}
      </text>
      <text x="50%" y="65%" textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="9">
        RISK SCORE
      </text>
    </svg>
  );
}

const TACTIC_COLORS: Record<string, string> = {
  "Initial Access": "text-rose-400",
  Execution: "text-orange-400",
  Persistence: "text-amber-400",
  Escalation: "text-yellow-400",
  Discovery: "text-blue-400",
  "Lateral Movement": "text-purple-400",
  "Command and Control": "text-pink-400",
  Exfiltration: "text-cyan-400",
};

export function AIAnalysisPage() {
  const { scans } = useScanStore();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [inputText, setInputText] = useState("");
  const [selectedScan, setSelectedScan] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleScanLoad = (scanId: string) => {
    setSelectedScan(scanId);
    const scan = scans.find((s) => s.id === scanId);
    if (scan) {
      const findings = scan.findings
        .map((f) => `[${f.severity.toUpperCase()}] ${f.title}: ${f.description}`)
        .join("\n");
      setInputText(findings || `Scan of ${scan.target} — no findings recorded.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/api/ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: inputText.trim(), scan_id: selectedScan || undefined }),
      });
      const data = (await res.json()) as AnalysisResult;
      setResult(data);
      addNotification({ type: "success", message: "AI analysis complete." });
    } catch {
      addNotification({ type: "error", message: "AI analysis request failed." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-slate-100">AI Analysis</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            LangChain-powered analysis with MITRE ATT&CK mapping and zero-day prediction.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Input panel */}
          <section className="lg:col-span-2">
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-white/5 p-4 backdrop-blur-sm">
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Input</h2>

                {scans.length > 0 && (
                  <div className="mb-3">
                    <label className="mb-1.5 block text-xs text-slate-500">Load from scan</label>
                    <select
                      value={selectedScan}
                      onChange={(e) => handleScanLoad(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 outline-none focus:border-purple-500/50"
                    >
                      <option value="">— select a scan —</option>
                      {scans.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.target} ({s.findings.length} findings)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="mb-1.5 block text-xs text-slate-500">Custom input</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste scan findings, log snippets, or vulnerability descriptions…"
                  rows={10}
                  className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                {loading ? "Analyzing…" : "Run Analysis"}
              </button>
            </form>
          </section>

          {/* Results */}
          <section className="space-y-4 lg:col-span-3">
            {loading && (
              <div className="flex flex-col items-center gap-4 py-16 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                <p className="text-sm">AI pipeline running…</p>
              </div>
            )}

            {result && !loading && (
              <>
                {/* Risk gauge + summary */}
                <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
                  <RiskGauge score={result.risk_score} />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Risk Level</p>
                    <p className={`text-lg font-bold capitalize ${
                      result.risk_level === "critical" ? "text-rose-400"
                      : result.risk_level === "high" ? "text-orange-400"
                      : result.risk_level === "medium" ? "text-amber-400"
                      : "text-emerald-400"
                    }`}>
                      {result.risk_level}
                    </p>
                    <p className="text-sm text-slate-400">{result.summary}</p>
                    <p className="text-xs text-slate-600">Confidence: {Math.round(result.confidence * 100)}%</p>
                  </div>
                </div>

                {/* MITRE ATT&CK */}
                <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-300">MITRE ATT&CK Mappings</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.mitre_mappings.map((m) => (
                      <li key={m.technique_id} className="flex items-center gap-3">
                        <span className="flex-shrink-0 rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-purple-300">
                          {m.technique_id}
                        </span>
                        <span className="flex-1 text-sm text-slate-300">{m.technique_name}</span>
                        <span className={`text-xs ${TACTIC_COLORS[m.tactic] ?? "text-slate-400"}`}>
                          {m.tactic}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Recommendations</h3>
                  </div>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {!result && !loading && (
              <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
                <Brain className="mx-auto mb-3 h-10 w-10 text-slate-700" />
                <p className="text-sm text-slate-500">Submit input to run AI analysis.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppLayout>
  );
}
