import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  ArrowRight,
  Bug,
  Brain,
  Check,
  Globe,
  Pin,
  PinOff,
  Radar,
  Shield,
  TerminalSquare,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

type PanelCategory = "pentest" | "soc" | "bounty" | "recon" | "ai" | "timeline";
type HubFilter = "all" | PanelCategory | "pinned";

type PanelCard = {
  id: PanelCategory;
  title: string;
  description: string;
  path: string;
  icon: ElementType;
  accent: string;
  bullets: string[];
  recommendedFor: string[];
  primaryAction: string;
};

type PlaybookCard = {
  id: string;
  title: string;
  description: string;
  path: string;
  badge: string;
};

const PIN_STORAGE_KEY = "cosmicsec-specialized-panels-pins";

const PANELS: PanelCard[] = [
  {
    id: "pentest",
    title: "Pentest Command Center",
    description: "Launch scans, pivot into AI analysis, and keep discovery flow in one place.",
    path: "/scans",
    icon: Radar,
    accent: "from-cyan-500/20 to-sky-500/10 border-cyan-500/20",
    bullets: ["Nmap + web scan workflows", "Live findings and progress", "AI-assisted triage"],
    recommendedFor: ["admin", "analyst", "user"],
    primaryAction: "Launch scan",
  },
  {
    id: "soc",
    title: "SOC Operations",
    description: "Incident posture, alert review, and SOC-style operational visibility.",
    path: "/phase5",
    icon: Shield,
    accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/20",
    bullets: ["Alert timelines", "Risk posture", "Incident handling"],
    recommendedFor: ["admin", "analyst"],
    primaryAction: "Open SOC",
  },
  {
    id: "bounty",
    title: "Bug Bounty Desk",
    description: "Track programs, submissions, payouts, and triage actions with operator-grade context.",
    path: "/bugbounty",
    icon: Bug,
    accent: "from-rose-500/20 to-orange-500/10 border-rose-500/20",
    bullets: ["Submission lifecycle", "Reward tracking", "Reviewer activity"],
    recommendedFor: ["admin", "analyst", "user"],
    primaryAction: "Review bounty",
  },
  {
    id: "recon",
    title: "OSINT & Recon",
    description: "Domain intelligence, enumeration, and external exposure discovery.",
    path: "/recon",
    icon: Globe,
    accent: "from-blue-500/20 to-indigo-500/10 border-blue-500/20",
    bullets: ["DNS and subdomains", "Proxy and Tor profiles", "Evidence export"],
    recommendedFor: ["admin", "analyst", "user"],
    primaryAction: "Start recon",
  },
  {
    id: "ai",
    title: "AI Co-Pilot",
    description: "Use live streaming analysis to explain findings and turn intent into action.",
    path: "/ai/chat",
    icon: Brain,
    accent: "from-violet-500/20 to-fuchsia-500/10 border-violet-500/20",
    bullets: ["Streaming responses", "Command guidance", "Tool-hint routing"],
    recommendedFor: ["admin", "analyst", "user"],
    primaryAction: "Open chat",
  },
  {
    id: "timeline",
    title: "Operator Timeline",
    description: "Cross-source activity view with direct drill-down into scans and plugins.",
    path: "/timeline",
    icon: Activity,
    accent: "from-amber-500/20 to-yellow-500/10 border-amber-500/20",
    bullets: ["Cross-source events", "Plugin trust events", "Scan drill-downs"],
    recommendedFor: ["admin", "analyst", "user"],
    primaryAction: "Review timeline",
  },
];

const PLAYBOOKS: PlaybookCard[] = [
  {
    id: "pentest-web-deep",
    title: "Deep Web Pentest",
    description: "Preloads full scan posture with web-focused tools and aggressive profile.",
    path: "/scans?preset=web-deep",
    badge: "Pentest",
  },
  {
    id: "recon-onion-stealth",
    title: "Onion Stealth Recon",
    description: "Applies stealth recon profile with Tor-first routing and identity rotation.",
    path: "/recon?preset=onion-stealth",
    badge: "Recon",
  },
  {
    id: "triage-ai-coach",
    title: "AI Triage Coach",
    description: "Jumps into AI chat for rapid triage and escalation playbook guidance.",
    path: "/ai/chat",
    badge: "AI",
  },
];

export function SpecializedPanelsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<HubFilter>("all");
  const [pinnedPanelIds, setPinnedPanelIds] = useState<PanelCategory[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PIN_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        setPinnedPanelIds(
          parsed.filter((value): value is PanelCategory =>
            PANELS.some((panel) => panel.id === value),
          ),
        );
      }
    } catch {
      // Ignore malformed preferences.
    }
  }, []);

  const savePins = (nextPinned: PanelCategory[]) => {
    setPinnedPanelIds(nextPinned);
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(nextPinned));
  };

  const userRole = user?.role ?? "user";

  const visiblePanels = useMemo(() => {
    const ordered = [...PANELS].sort((left, right) => {
      const leftPinned = pinnedPanelIds.includes(left.id) ? 1 : 0;
      const rightPinned = pinnedPanelIds.includes(right.id) ? 1 : 0;
      if (leftPinned !== rightPinned) return rightPinned - leftPinned;

      const leftRecommended = left.recommendedFor.includes(userRole) ? 1 : 0;
      const rightRecommended = right.recommendedFor.includes(userRole) ? 1 : 0;
      if (leftRecommended !== rightRecommended) return rightRecommended - leftRecommended;

      return PANELS.findIndex((panel) => panel.id === left.id) - PANELS.findIndex((panel) => panel.id === right.id);
    });

    return ordered.filter((panel) => {
      if (filter === "all") return true;
      if (filter === "pinned") return pinnedPanelIds.includes(panel.id);
      return panel.id === filter;
    });
  }, [filter, pinnedPanelIds, userRole]);

  const recommendedCount = useMemo(
    () => PANELS.filter((panel) => panel.recommendedFor.includes(userRole)).length,
    [userRole],
  );

  const togglePin = (panelId: PanelCategory) => {
    if (pinnedPanelIds.includes(panelId)) {
      savePins(pinnedPanelIds.filter((entry) => entry !== panelId));
      return;
    }

    savePins([panelId, ...pinnedPanelIds].slice(0, 4));
  };

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
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5">
                    Role: <span className="font-semibold capitalize text-cyan-200">{userRole}</span>
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5">
                    Recommended panels: {recommendedCount}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5">
                    Pinned panels: {pinnedPanelIds.length}
                  </span>
                </div>
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-50">Customize your hub</h2>
              <p className="text-sm text-slate-400">
                Pin the panels you use most and filter the hub for a specific workflow.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "pinned", label: "Pinned" },
                { id: "pentest", label: "Pentest" },
                { id: "soc", label: "SOC" },
                { id: "bounty", label: "Bug Bounty" },
                { id: "recon", label: "Recon" },
                { id: "ai", label: "AI" },
                { id: "timeline", label: "Timeline" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id as HubFilter)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${filter === item.id ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visiblePanels.map((panel) => {
            const Icon = panel.icon;
            const pinned = pinnedPanelIds.includes(panel.id);

            return (
              <article
                key={panel.id}
                className={`rounded-2xl border bg-linear-to-br ${panel.accent} p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.45)] backdrop-blur-sm ${pinned ? "ring-1 ring-cyan-400/40" : ""}`}
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
                    {pinned ? "Pinned" : "Ready"}
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

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={panel.path}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm font-medium text-slate-100 transition-colors hover:border-cyan-500/40 hover:text-cyan-300"
                    >
                      {panel.primaryAction}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => togglePin(panel.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:text-slate-50"
                    >
                      {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                      {pinned ? "Unpin" : "Pin"}
                    </button>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Check className="h-3.5 w-3.5 text-cyan-400" />
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
                Specialized panels foundation: 35%
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

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Quick Launch Playbooks</h2>
              <p className="text-sm text-slate-400">
                One-click entry points into preset workflows for faster operator execution.
              </p>
            </div>
            <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
              Preset launchers
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {PLAYBOOKS.map((playbook) => (
              <article
                key={playbook.id}
                className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{playbook.title}</h3>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                    {playbook.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{playbook.description}</p>
                <Link
                  to={playbook.path}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
                >
                  Launch playbook
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
