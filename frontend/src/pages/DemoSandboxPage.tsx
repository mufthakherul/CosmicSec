import { AlertTriangle, Brain, Globe, Info, Link as LinkIcon, Radar, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { DEMO_AI_ANALYSIS, DEMO_FINDINGS, DEMO_RECON, DEMO_SCAN } from "../data/demoFixtures";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  medium: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  info: "bg-blue-500/20 text-blue-300 border-blue-500/40",
};

export function DemoSandboxPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Demo banner */}
      <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 text-center py-2 text-sm font-semibold">
        🔬 Demo Mode — All data is mocked. No real targets are scanned.{" "}
        <Link to="/auth/register" className="underline font-bold">
          Register free
        </Link>{" "}
        to scan real targets.
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">CosmicSec Demo Sandbox</h1>
            <p className="text-sm text-slate-400">
              Explore a sample security assessment for{" "}
              <code className="text-cyan-400">{DEMO_SCAN.target}</code>
            </p>
          </div>
        </div>

        {/* Scan summary card */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Radar className="h-5 w-5 text-cyan-400" />
            Scan Summary
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Status" value={DEMO_SCAN.status} color="text-emerald-400" />
            <Stat label="Total Findings" value={String(DEMO_SCAN.summary.total_findings)} />
            <Stat
              label="Critical"
              value={String(DEMO_SCAN.summary.critical)}
              color="text-rose-400"
            />
            <Stat label="High" value={String(DEMO_SCAN.summary.high)} color="text-orange-400" />
          </div>
        </section>

        {/* Findings */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Findings
          </h2>
          <div className="space-y-4">
            {DEMO_FINDINGS.map((f) => (
              <div
                key={f.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-white">{f.title}</h3>
                  <span
                    className={`shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold uppercase ${SEVERITY_COLORS[f.severity] ?? SEVERITY_COLORS.info}`}
                  >
                    {f.severity}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{f.description}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    <b className="text-slate-400">Tool:</b> {f.tool}
                  </span>
                  <span>
                    <b className="text-slate-400">Target:</b> {f.target}
                  </span>
                  {f.cvss_score && (
                    <span>
                      <b className="text-slate-400">CVSS:</b> {f.cvss_score}
                    </span>
                  )}
                  {f.mitre_technique && (
                    <span>
                      <b className="text-slate-400">MITRE:</b> {f.mitre_technique}
                    </span>
                  )}
                </div>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-slate-300">Evidence</summary>
                  <code className="block mt-2 rounded bg-slate-950 p-3 text-cyan-400 whitespace-pre-wrap">
                    {f.evidence}
                  </code>
                </details>
              </div>
            ))}
          </div>
        </section>

        {/* Recon results */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-400" />
            Recon Results
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReconCard title="DNS Records">
              <div className="space-y-1 text-sm">
                <p>
                  <b className="text-slate-400">A:</b> {DEMO_RECON.dns.a_records.join(", ")}
                </p>
                <p>
                  <b className="text-slate-400">MX:</b> {DEMO_RECON.dns.mx_records.join(", ")}
                </p>
                <p>
                  <b className="text-slate-400">NS:</b> {DEMO_RECON.dns.ns_records.join(", ")}
                </p>
              </div>
            </ReconCard>
            <ReconCard title="Subdomains">
              <ul className="space-y-1 text-sm">
                {DEMO_RECON.subdomains.map((s) => (
                  <li key={s} className="text-cyan-400 font-mono">
                    {s}
                  </li>
                ))}
              </ul>
            </ReconCard>
            <ReconCard title="Shodan">
              <div className="space-y-1 text-sm">
                <p>
                  <b className="text-slate-400">Open Ports:</b> {DEMO_RECON.shodan.ports.join(", ")}
                </p>
                <p>
                  <b className="text-slate-400">Org:</b> {DEMO_RECON.shodan.org}
                </p>
                <p>
                  <b className="text-slate-400">Country:</b> {DEMO_RECON.shodan.country}
                </p>
              </div>
            </ReconCard>
          </div>
        </section>

        {/* AI Analysis */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-400" />
            AI Analysis
          </h2>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-rose-400">
                  {DEMO_AI_ANALYSIS.risk_score}
                </div>
                <div className="text-xs text-slate-400 mt-1 uppercase tracking-wide">
                  Risk Score
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed flex-1">
                {DEMO_AI_ANALYSIS.summary}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {DEMO_AI_ANALYSIS.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                    <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">MITRE ATT&CK Mappings</h3>
              <div className="flex flex-wrap gap-2">
                {DEMO_AI_ANALYSIS.mitre_mappings.map((m) => (
                  <span
                    key={m.technique}
                    className="rounded-full bg-purple-500/20 border border-purple-500/40 px-3 py-1 text-xs text-purple-300"
                  >
                    {m.technique} — {m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <h2 className="text-2xl font-bold mb-3">Want to scan real targets?</h2>
          <p className="text-slate-400 mb-6">
            Register for a free account and run your first scan in under 2 minutes.
          </p>
          <Link
            to="/auth/register"
            className="inline-block rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-slate-950 hover:bg-cyan-400 transition-all"
          >
            Create Free Account
          </Link>
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  );
}

function ReconCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
      {children}
    </div>
  );
}
