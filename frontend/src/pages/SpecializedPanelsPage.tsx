import { Link } from "react-router-dom";
import type { ElementType } from "react";
import { Activity, ArrowRight, Bug, Brain, Globe, Radar, Shield, TerminalSquare } from "lucide-react";
import { AppLayout } from "../components/AppLayout";

type PanelCard = {
  title: string;
  description: string;
  path: string;
  icon: ElementType;
  accent: string;
  bullets: string[];
};

const PANELS: PanelCard[] = [
  {
    title: "Pentest Command Center",
    description: "Launch scans, pivot into AI analysis, and keep discovery flow in one place.",
    path: "/scans",
    icon: Radar,
    accent: "from-cyan-500/20 to-sky-500/10 border-cyan-500/20",
    bullets: ["Nmap + web scan workflows", "Live findings and progress", "AI-assisted triage"],
  },
  {
    title: "SOC Operations",
    description: "Incident posture, alert review, and SOC-style operational visibility.",
    path: "/phase5",
    icon: Shield,
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20",
    bullets: ["Alert timelines", "Risk posture", "Incident handling"],
  },
  {
    title: "Bug Bounty Desk",
    description: "Track programs, submissions, payouts, and triage actions with operator-grade context.",
    path: "/bugbounty",
    icon: Bug,
    accent: "from-rose-500/20 to-orange-500/10 border-rose-500/20",
    bullets: ["Submission lifecycle", "Reward tracking", "Reviewer activity"],
  },
  {
    title: "OSINT & Recon",
    description: "Domain intelligence, enumeration, and external exposure discovery.",
    path: "/recon",
    icon: Globe,
    accent: "from-blue-500/20 to-indigo-500/10 border-blue-500/20",
    bullets: ["DNS and subdomains", "Proxy and Tor profiles", "Evidence export"],
  },
  {
    title: "AI Co-Pilot",
    description: "Use live streaming analysis to explain findings and turn intent into action.",
    path: "/ai/chat",
    icon: Brain,
    accent: "from-violet-500/20 to-fuchsia-500/10 border-violet-500/20",
    bullets: ["Streaming responses", "Command guidance", "Tool-hint routing"],
  },
  {
    title: "Operator Timeline",
    description: "Cross-source activity view with direct drill-down into scans and plugins.",
    path: "/timeline",
    icon: Activity,
    accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/20",
    bullets: ["Cross-source events", "Plugin trust events", "Scan drill-downs"],
  },
];

export function SpecializedPanelsPage() {
  return (
    <AppLayout>
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl border border-cyan-500/15 bg-linear-to-br from-slate-950 via-slate-950 to-cyan-950/40 p-6 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <TerminalSquare className="h-3.5 w-3.5" />
                Specialized Panels
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-slate-50 md:text-4xl">
                  One command surface for pentest, SOC, recon, and bounty workflows.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  This hub turns the current product surfaces into role-focused operator panels so
                  users can jump from intent to execution without hunting across the app.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
              {[
                { label: "Live panels", value: "6" },
                { label: "Premium paths", value: "4" },
                { label: "Drill-downs", value: "8" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
                  <div className="text-2xl font-semibold text-slate-100">{item.value}</div>
                  <div className="mt-1 uppercase tracking-[0.18em] text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {PANELS.map((panel) => {
            const Icon = panel.icon;
            return (
              <article
                key={panel.title}
                className={`rounded-2xl border bg-linear-to-br ${panel.accent} p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.45)] backdrop-blur-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 text-slate-100">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-50">{panel.title}</h2>
                      <p className="mt-1 text-sm text-slate-300">{panel.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-950/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    Ready
                  </span>
                </div>

                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  {panel.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <Link
                    to={panel.path}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                  >
                    Open panel
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    Operator view
                  </span>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.35fr,0.85fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-50">What this hub unlocks</h2>
            <p className="mt-2 text-sm text-slate-400">
              The goal is not to duplicate every workflow. It is to give each operator role a
              premium front door, then route them into the already-implemented surfaces with less
              friction.
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                "Pentest operators start with scans and AI-assisted triage.",
                "SOC users jump into incidents, risk posture, and alert review.",
                "Bug bounty analysts stay inside submissions, payouts, and timelines.",
                "Recon users keep OSINT, Tor, and evidence collection close together.",
              ].map((line) => (
                <div key={line} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-300">
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-slate-50">Roadmap alignment</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                Specialized panels foundation: 25%
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                Pentest, SOC, bug bounty, and recon surfaces are now grouped into a single
                operator entry point.
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                Next step: convert the hub into role-aware execution launchers and real-time
                telemetry widgets.
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}