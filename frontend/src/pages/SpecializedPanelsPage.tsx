import { Link } from "react-router-dom";
import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bug,
  Brain,
  Clock3,
  Gauge,
  Check,
  Globe,
  LayoutGrid,
  List,
  Pin,
  PinOff,
  Radar,
  RefreshCw,
  Search,
  Shield,
  TerminalSquare,
  Trash2,
  Star,
  Users,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

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

type ToolPack = {
  id: string;
  title: string;
  role: "pentest" | "soc" | "bounty" | "osint" | "redteam" | "ctf" | "malware";
  tools: string[];
  objective: string;
  launchPath: string;
};

type LaunchEvent = {
  id: string;
  label: string;
  kind: "panel" | "playbook" | "pack";
  timestamp: string;
};

type LaunchIntervalStats = {
  medianSeconds: number | null;
  averageSeconds: number | null;
  launchesLastHour: number;
};

type PanelViewMode = "cards" | "compact";
type PanelDensity = "comfortable" | "dense";

type HubTelemetry = {
  activeScans: number;
  connectedAgents: number;
  criticalFindings: number;
  openBugs: number;
  updatedAt: string;
};

type LaunchHistoryScope = "all" | LaunchEvent["kind"];

type LaunchDigest = {
  role: string;
  recommendation: string;
  scope: LaunchHistoryScope;
  recentCount: number;
  topLaunch: string | null;
  medianLaunchInterval: string;
  averageLaunchInterval: string;
};

const PIN_STORAGE_KEY = "cosmicsec-specialized-panels-pins";
const VIEW_MODE_STORAGE_KEY = "cosmicsec-specialized-panels-view";
const DENSITY_STORAGE_KEY = "cosmicsec-specialized-panels-density";
const LAUNCH_HISTORY_STORAGE_KEY = "cosmicsec-specialized-panels-launch-history";
const FAVORITE_PACKS_STORAGE_KEY = "cosmicsec-specialized-panels-favorite-packs";
const API = getApiGatewayBaseUrl();

const formatInterval = (seconds: number | null) => {
  if (seconds === null || Number.isNaN(seconds)) return "n/a";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  return `${(minutes / 60).toFixed(1)}h`;
};

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
  {
    id: "red-team-chain",
    title: "Red Team Chain",
    description: "Stages recon-to-scan flow tuned for stealth-forward adversary simulation.",
    path: "/scans?preset=redteam-chain",
    badge: "Red Team",
  },
  {
    id: "malware-surface",
    title: "Malware Surface Sweep",
    description: "Targets suspicious surface signals with focused scan behavior and triage pace.",
    path: "/scans?preset=malware-surface",
    badge: "Malware",
  },
  {
    id: "ctf-sprint",
    title: "CTF Sprint Recon",
    description: "Fast reconnaissance defaults for challenge-style exploration and iteration.",
    path: "/recon?preset=ctf-recon",
    badge: "CTF",
  },
];

const TOOL_PACKS: ToolPack[] = [
  {
    id: "pentest-burst",
    title: "Pentest Burst Pack",
    role: "pentest",
    tools: ["nmap", "nuclei", "nikto", "sqlmap"],
    objective: "Fast vulnerability surfacing with exploitability context.",
    launchPath: "/scans?preset=pentest-fast",
  },
  {
    id: "soc-triage",
    title: "SOC Triage Pack",
    role: "soc",
    tools: ["timeline", "alerts", "risk posture"],
    objective: "Prioritize incidents and focus on critical path containment.",
    launchPath: "/scans?preset=soc-triage",
  },
  {
    id: "bounty-hunter",
    title: "Bounty Hunter Pack",
    role: "bounty",
    tools: ["program triage", "submission queue", "payout intelligence"],
    objective: "Drive report throughput with faster reward-oriented workflow transitions.",
    launchPath: "/bugbounty",
  },
  {
    id: "osint-surface",
    title: "OSINT Surface Pack",
    role: "osint",
    tools: ["dns", "crtsh", "rdap", "virustotal"],
    objective: "Build fast external attack-surface snapshots for analyst handoff.",
    launchPath: "/recon?preset=osint-surface",
  },
  {
    id: "red-team-stealth",
    title: "Red Team Stealth Pack",
    role: "redteam",
    tools: ["nmap", "nuclei", "timeline", "ai triage"],
    objective: "Run stealth-oriented chain flows with controlled signal footprint.",
    launchPath: "/scans?preset=redteam-chain",
  },
  {
    id: "ctf-ops",
    title: "CTF Ops Pack",
    role: "ctf",
    tools: ["recon", "web fuzz", "timeline"],
    objective: "Accelerate challenge iteration with fast recon and compact execution loops.",
    launchPath: "/recon?preset=ctf-recon",
  },
  {
    id: "malware-response",
    title: "Malware Response Pack",
    role: "malware",
    tools: ["risk snapshot", "scan triage", "reporting"],
    objective: "Prioritize suspicious indicators for downstream malware analysis and reporting.",
    launchPath: "/scans?preset=malware-surface",
  },
];

export function SpecializedPanelsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<HubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedPanelIds, setPinnedPanelIds] = useState<PanelCategory[]>([]);
  const [viewMode, setViewMode] = useState<PanelViewMode>("cards");
  const [density, setDensity] = useState<PanelDensity>("comfortable");
  const [telemetry, setTelemetry] = useState<HubTelemetry>({
    activeScans: 0,
    connectedAgents: 0,
    criticalFindings: 0,
    openBugs: 0,
    updatedAt: "",
  });
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [launchHistory, setLaunchHistory] = useState<LaunchEvent[]>([]);
  const [launchHistoryScope, setLaunchHistoryScope] = useState<LaunchHistoryScope>("all");
  const [favoriteToolPackIds, setFavoriteToolPackIds] = useState<string[]>([]);

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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAUNCH_HISTORY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LaunchEvent[];
      if (Array.isArray(parsed)) {
        setLaunchHistory(
          parsed.filter(
            (entry) =>
              typeof entry?.id === "string" &&
              typeof entry?.label === "string" &&
              typeof entry?.kind === "string" &&
              typeof entry?.timestamp === "string",
          ),
        );
      }
    } catch {
      // Ignore malformed launch history.
    }
  }, []);

  useEffect(() => {
    try {
      const rawView = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (rawView === "cards" || rawView === "compact") {
        setViewMode(rawView);
      }

      const rawDensity = localStorage.getItem(DENSITY_STORAGE_KEY);
      if (rawDensity === "comfortable" || rawDensity === "dense") {
        setDensity(rawDensity);
      }
    } catch {
      // Ignore malformed preferences.
    }
  }, []);

  useEffect(() => {
    try {
      const rawFavorites = localStorage.getItem(FAVORITE_PACKS_STORAGE_KEY);
      if (!rawFavorites) return;
      const parsed = JSON.parse(rawFavorites) as unknown;
      if (Array.isArray(parsed)) {
        setFavoriteToolPackIds(
          parsed.filter((value): value is string =>
            TOOL_PACKS.some((pack) => pack.id === value),
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

  const setAndPersistViewMode = (nextViewMode: PanelViewMode) => {
    setViewMode(nextViewMode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, nextViewMode);
  };

  const setAndPersistDensity = (nextDensity: PanelDensity) => {
    setDensity(nextDensity);
    localStorage.setItem(DENSITY_STORAGE_KEY, nextDensity);
  };

  const resetHubPersonalization = () => {
    setPinnedPanelIds([]);
    setViewMode("cards");
    setDensity("comfortable");
    setLaunchHistory([]);
    setLaunchHistoryScope("all");
    setFavoriteToolPackIds([]);

    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    localStorage.removeItem(DENSITY_STORAGE_KEY);
    localStorage.removeItem(LAUNCH_HISTORY_STORAGE_KEY);
    localStorage.removeItem(FAVORITE_PACKS_STORAGE_KEY);
  };

  const toggleFavoriteToolPack = (packId: string) => {
    const nextFavorites = favoriteToolPackIds.includes(packId)
      ? favoriteToolPackIds.filter((entry) => entry !== packId)
      : [packId, ...favoriteToolPackIds].slice(0, 6);

    setFavoriteToolPackIds(nextFavorites);
    localStorage.setItem(FAVORITE_PACKS_STORAGE_KEY, JSON.stringify(nextFavorites));
  };

  useEffect(() => {
    let cancelled = false;

    const fetchTelemetry = async () => {
      setTelemetryLoading(true);
      try {
        const token = localStorage.getItem("cosmicsec_token");
        const response = await fetch(`${API}/api/dashboard/overview`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) throw new Error("telemetry unavailable");
        const payload = (await response.json()) as {
          total_scans?: number;
          active_agents?: number;
          critical_findings?: number;
          open_bugs?: number;
        };

        if (cancelled) return;
        setTelemetry({
          activeScans: payload.total_scans ?? 0,
          connectedAgents: payload.active_agents ?? 0,
          criticalFindings: payload.critical_findings ?? 0,
          openBugs: payload.open_bugs ?? 0,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        if (cancelled) return;
        setTelemetry((current) => ({
          ...current,
          updatedAt: current.updatedAt || new Date().toISOString(),
        }));
      } finally {
        if (!cancelled) setTelemetryLoading(false);
      }
    };

    void fetchTelemetry();
    const interval = window.setInterval(() => {
      void fetchTelemetry();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

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
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        [panel.title, panel.description, ...panel.bullets]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());

      if (!matchesSearch) return false;
      if (filter === "all") return true;
      if (filter === "pinned") return pinnedPanelIds.includes(panel.id);
      return panel.id === filter;
    });
  }, [filter, pinnedPanelIds, searchQuery, userRole]);

  const recommendedCount = useMemo(
    () => PANELS.filter((panel) => panel.recommendedFor.includes(userRole)).length,
    [userRole],
  );

  const visibleToolPacks = useMemo(() => {
    return [...TOOL_PACKS].sort((left, right) => {
      const leftFavorite = favoriteToolPackIds.includes(left.id) ? 1 : 0;
      const rightFavorite = favoriteToolPackIds.includes(right.id) ? 1 : 0;
      if (leftFavorite !== rightFavorite) return rightFavorite - leftFavorite;

      const leftRoleMatch = left.role === userRole ? 1 : 0;
      const rightRoleMatch = right.role === userRole ? 1 : 0;
      if (leftRoleMatch !== rightRoleMatch) return rightRoleMatch - leftRoleMatch;

      return TOOL_PACKS.findIndex((pack) => pack.id === left.id) - TOOL_PACKS.findIndex((pack) => pack.id === right.id);
    });
  }, [favoriteToolPackIds, userRole]);

  const togglePin = (panelId: PanelCategory) => {
    if (pinnedPanelIds.includes(panelId)) {
      savePins(pinnedPanelIds.filter((entry) => entry !== panelId));
      return;
    }

    savePins([panelId, ...pinnedPanelIds].slice(0, 4));
  };

  const recordLaunch = (label: string, kind: LaunchEvent["kind"]) => {
    const nextEvent: LaunchEvent = {
      id: `${kind}-${Date.now()}`,
      label,
      kind,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [nextEvent, ...launchHistory].slice(0, 20);
    setLaunchHistory(nextHistory);
    localStorage.setItem(LAUNCH_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
  };

  const clearLaunchHistory = () => {
    setLaunchHistory([]);
    localStorage.removeItem(LAUNCH_HISTORY_STORAGE_KEY);
  };

  const copyLaunchDigest = async () => {
    const digest: LaunchDigest = {
      role: userRole,
      recommendation: launchInsights.adaptiveRecommendation.label,
      scope: launchHistoryScope,
      recentCount: scopedLaunchHistory.length,
      topLaunch: launchInsights.topLaunch ? launchInsights.topLaunch[0] : null,
      medianLaunchInterval: formatInterval(launchInsights.intervalStats.medianSeconds),
      averageLaunchInterval: formatInterval(launchInsights.intervalStats.averageSeconds),
    };

    await navigator.clipboard.writeText(JSON.stringify(digest, null, 2));
  };

  const scopedLaunchHistory = useMemo(() => {
    if (launchHistoryScope === "all") return launchHistory;
    return launchHistory.filter((entry) => entry.kind === launchHistoryScope);
  }, [launchHistory, launchHistoryScope]);

  const launchInsights = useMemo(() => {
    const counts = launchHistory.reduce<Record<string, number>>((accumulator, event) => {
      accumulator[event.label] = (accumulator[event.label] ?? 0) + 1;
      return accumulator;
    }, {});

    const topLaunch = Object.entries(counts).sort((left, right) => right[1] - left[1])[0];
    const launchByKind = launchHistory.reduce<Record<LaunchEvent["kind"], number>>(
      (accumulator, event) => {
        accumulator[event.kind] += 1;
        return accumulator;
      },
      { panel: 0, playbook: 0, pack: 0 },
    );

    const intervalStats = (() => {
      if (launchHistory.length < 2) {
        return {
          medianSeconds: null,
          averageSeconds: null,
          launchesLastHour: launchHistory.filter(
            (entry) => Date.now() - new Date(entry.timestamp).getTime() <= 60 * 60 * 1000,
          ).length,
        } as LaunchIntervalStats;
      }

      const sortedByTime = [...launchHistory]
        .map((entry) => new Date(entry.timestamp).getTime())
        .sort((left, right) => right - left);

      const intervals = sortedByTime
        .slice(0, sortedByTime.length - 1)
        .map((current, index) => Math.max(0, (current - sortedByTime[index + 1]) / 1000));

      if (intervals.length === 0) {
        return {
          medianSeconds: null,
          averageSeconds: null,
          launchesLastHour: launchHistory.filter(
            (entry) => Date.now() - new Date(entry.timestamp).getTime() <= 60 * 60 * 1000,
          ).length,
        } as LaunchIntervalStats;
      }

      const orderedIntervals = [...intervals].sort((left, right) => left - right);
      const mid = Math.floor(orderedIntervals.length / 2);
      const medianSeconds =
        orderedIntervals.length % 2 === 0
          ? (orderedIntervals[mid - 1] + orderedIntervals[mid]) / 2
          : orderedIntervals[mid];
      const averageSeconds = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;

      return {
        medianSeconds,
        averageSeconds,
        launchesLastHour: launchHistory.filter(
          (entry) => Date.now() - new Date(entry.timestamp).getTime() <= 60 * 60 * 1000,
        ).length,
      } as LaunchIntervalStats;
    })();

    const adaptiveRecommendation = (() => {
      if (telemetry.criticalFindings > 0) {
        return {
          label: "AI Triage Coach",
          path: "/ai/chat",
          reason: "Critical findings are elevated. Prioritize triage and guided response.",
        };
      }

      if (userRole === "analyst") {
        return {
          label: "SOC Triage Pack",
          path: "/scans?preset=soc-triage",
          reason: "Analyst role detected. Focus on incident flow and risk posture.",
        };
      }

      if (userRole === "admin") {
        return {
          label: "Red Team Chain",
          path: "/scans?preset=redteam-chain",
          reason: "Admin role detected. Expand adversary-simulation readiness checks.",
        };
      }

      return {
        label: "OSINT Surface Pack",
        path: "/recon?preset=osint-surface",
        reason: "Default recommendation for broad external footprint visibility.",
      };
    })();

    return {
      topLaunch,
      adaptiveRecommendation,
      recent: launchHistory.slice(0, 3),
      launchByKind,
      intervalStats,
      confidenceLevel:
        intervalStats.launchesLastHour >= 6
          ? "high"
          : intervalStats.launchesLastHour >= 3
            ? "medium"
            : "building",
    };
  }, [launchHistory, telemetry.criticalFindings, userRole]);

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
              <label className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-300">
                <Search className="h-3.5 w-3.5 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search panels"
                  className="w-28 bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-500"
                />
              </label>
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
              <div className="flex rounded-full border border-slate-700 bg-slate-950/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setAndPersistViewMode("cards")}
                  aria-label="Switch to card view"
                  title="Card view"
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${viewMode === "cards" ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400"}`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setAndPersistViewMode("compact")}
                  aria-label="Switch to compact view"
                  title="Compact view"
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${viewMode === "compact" ? "bg-cyan-500/15 text-cyan-300" : "text-slate-400"}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAndPersistDensity(density === "comfortable" ? "dense" : "comfortable")}
                className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300"
              >
                Density: {density === "comfortable" ? "Comfort" : "Dense"}
              </button>
              <button
                type="button"
                onClick={resetHubPersonalization}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset hub
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Role Tool Packs</h2>
              <p className="text-sm text-slate-400">
                Curated tool categories for pentesters, SOC analysts, bounty operators, and OSINT workflows.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                Categorized by role
              </span>
              <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">
                Favorites: {favoriteToolPackIds.length}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {visibleToolPacks.map((pack) => (
              <article key={pack.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-100">{pack.title}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={favoriteToolPackIds.includes(pack.id) ? `Unfavorite ${pack.title}` : `Favorite ${pack.title}`}
                      title={favoriteToolPackIds.includes(pack.id) ? "Unfavorite pack" : "Favorite pack"}
                      onClick={() => toggleFavoriteToolPack(pack.id)}
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${favoriteToolPackIds.includes(pack.id) ? "border-amber-400/40 bg-amber-500/15 text-amber-300" : "border-slate-700 bg-slate-900 text-slate-500 hover:border-amber-400/30 hover:text-amber-200"}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${favoriteToolPackIds.includes(pack.id) ? "fill-current" : ""}`} />
                    </button>
                    <span className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-300">
                      {pack.role}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">{pack.objective}</p>
                {favoriteToolPackIds.includes(pack.id) ? (
                  <div className="mt-2 inline-flex rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200">
                    Favorite
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {pack.tools.map((tool) => (
                    <span key={tool} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                      {tool}
                    </span>
                  ))}
                </div>
                <Link
                  to={pack.launchPath}
                  onClick={() => recordLaunch(pack.title, "pack")}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-cyan-500/30 hover:text-cyan-300"
                >
                  Open pack
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Execution Timing Analytics</h2>
              <p className="text-sm text-slate-400">
                Measures launch cadence so playbook recommendations can adapt to operator tempo.
              </p>
            </div>
            <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300 capitalize">
              Recommendation confidence: {launchInsights.confidenceLevel}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Median launch interval</span>
                <Clock3 className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {formatInterval(launchInsights.intervalStats.medianSeconds)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Average launch interval</span>
                <Gauge className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {formatInterval(launchInsights.intervalStats.averageSeconds)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Launches in last hour</span>
                <BarChart3 className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {launchInsights.intervalStats.launchesLastHour}
              </p>
            </article>
            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pack launch ratio</span>
                <Activity className="h-4 w-4" />
              </div>
              <p className="mt-2 text-lg font-semibold text-slate-100">
                {launchHistory.length === 0
                  ? "n/a"
                  : `${Math.round((launchInsights.launchByKind.pack / launchHistory.length) * 100)}%`}
              </p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              Panels launches: <span className="font-semibold text-slate-100">{launchInsights.launchByKind.panel}</span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              Playbook launches: <span className="font-semibold text-slate-100">{launchInsights.launchByKind.playbook}</span>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
              Pack launches: <span className="font-semibold text-slate-100">{launchInsights.launchByKind.pack}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-50">Adaptive Recommendations</h2>
              <p className="text-sm text-slate-400">
                The hub adapts launch guidance from role context, findings pressure, and recent operator behavior.
              </p>
            </div>
            {launchInsights.topLaunch ? (
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-300">
                Most launched: {launchInsights.topLaunch[0]} ({launchInsights.topLaunch[1]}x)
              </span>
            ) : (
              <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs text-slate-400">
                Launch history building
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
            <article className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-4">
              <h3 className="text-sm font-semibold text-cyan-200">Recommended now</h3>
              <p className="mt-1 text-xs text-cyan-100/90">{launchInsights.adaptiveRecommendation.reason}</p>
              <Link
                to={launchInsights.adaptiveRecommendation.path}
                onClick={() => recordLaunch(launchInsights.adaptiveRecommendation.label, "playbook")}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25"
              >
                Launch {launchInsights.adaptiveRecommendation.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>

            <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <h3 className="text-sm font-semibold text-slate-200">Recent launches</h3>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {[
                  { id: "all", label: "Everything" },
                  { id: "panel", label: "Panels" },
                  { id: "playbook", label: "Playbooks" },
                  { id: "pack", label: "Packs" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLaunchHistoryScope(item.id as LaunchHistoryScope)}
                    className={`rounded-full border px-2.5 py-1 font-semibold transition-colors ${launchHistoryScope === item.id ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearLaunchHistory}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 font-semibold text-slate-300 transition-colors hover:border-rose-500/40 hover:text-rose-300"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear history
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {scopedLaunchHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">No launches yet in this browser profile.</p>
                ) : (
                  scopedLaunchHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-slate-300">
                      <span className="font-medium text-slate-200">{entry.label}</span>
                      <span className="ml-2 text-slate-500 capitalize">{entry.kind}</span>
                      <span className="ml-2 text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-300">
            <div>
              <div className="font-semibold text-slate-100">Operator snapshot</div>
              <div className="mt-1 text-slate-400">
                Copy a compact summary of the current hub state for notes, handoff, or reporting.
              </div>
            </div>
            <button
              type="button"
              onClick={() => void copyLaunchDigest()}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/20"
            >
              Copy snapshot
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-50">Live Hub Telemetry</h2>
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <RefreshCw className={`h-3.5 w-3.5 ${telemetryLoading ? "animate-spin" : ""}`} />
              {telemetry.updatedAt
                ? `Updated ${new Date(telemetry.updatedAt).toLocaleTimeString()}`
                : "Waiting for first sync"}
            </span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            {[
              {
                id: "scans",
                label: "Active scans",
                value: telemetry.activeScans,
                icon: Gauge,
              },
              {
                id: "agents",
                label: "Connected agents",
                value: telemetry.connectedAgents,
                icon: Users,
              },
              {
                id: "critical",
                label: "Critical findings",
                value: telemetry.criticalFindings,
                icon: AlertTriangle,
              },
              {
                id: "bugs",
                label: "Open bug cases",
                value: telemetry.openBugs,
                icon: Bug,
              },
            ].map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{item.label}</span>
                  <item.icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-100">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={`grid gap-4 ${viewMode === "cards" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"}`}>
          {visiblePanels.map((panel) => {
            const Icon = panel.icon;
            const pinned = pinnedPanelIds.includes(panel.id);
            const bodyPadding = density === "dense" ? "p-4" : "p-5";
            const compactMode = viewMode === "compact";
            const visibleBullets = compactMode ? panel.bullets.slice(0, 2) : panel.bullets;

            return (
              <article
                key={panel.id}
                className={`rounded-2xl border bg-linear-to-br ${panel.accent} ${bodyPadding} shadow-[0_0_0_1px_rgba(15,23,42,0.45)] backdrop-blur-sm ${pinned ? "ring-1 ring-cyan-400/40" : ""}`}
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
                  {visibleBullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      {bullet}
                    </li>
                  ))}
                </ul>

                {compactMode && panel.bullets.length > visibleBullets.length ? (
                  <p className="mt-2 text-xs text-slate-400">+{panel.bullets.length - visibleBullets.length} more capabilities</p>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={panel.path}
                      onClick={() => recordLaunch(panel.title, "panel")}
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
                Specialized panels foundation: 84%
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
                  onClick={() => recordLaunch(playbook.title, "playbook")}
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
