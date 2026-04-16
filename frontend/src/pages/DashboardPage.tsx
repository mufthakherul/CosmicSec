import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Brain,
  Bug,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Play,
  Radar,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverviewStats {
  total_scans: number;
  critical_findings: number;
  active_agents: number;
  open_bugs: number;
  security_score: number;
  scans_today: number;
  findings_last_7d: number;
  compliance_pct: number;
}

interface RecentActivity {
  id: string;
  type: "scan" | "finding" | "agent" | "report";
  title: string;
  description: string;
  severity?: "critical" | "high" | "medium" | "low" | "info";
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mock data (fallback when API unavailable)
// ---------------------------------------------------------------------------

const MOCK_STATS: OverviewStats = {
  total_scans: 247,
  critical_findings: 12,
  active_agents: 3,
  open_bugs: 8,
  security_score: 74,
  scans_today: 5,
  findings_last_7d: 38,
  compliance_pct: 81,
};

const MOCK_ACTIVITY: RecentActivity[] = [
  {
    id: "act-1",
    type: "finding",
    title: "SQL Injection — api.example.com",
    description: "Blind SQL injection in /api/users endpoint parameter",
    severity: "critical",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "act-2",
    type: "scan",
    title: "Network scan completed",
    description: "192.168.1.0/24 — 8 open ports found",
    severity: "medium",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act-3",
    type: "agent",
    title: "Local agent connected",
    description: "agent-dev-01 registered with nmap, nuclei, nikto",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act-4",
    type: "report",
    title: "Compliance report generated",
    description: "SOC 2 readiness report — 81% compliant",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "act-5",
    type: "finding",
    title: "XSS — login form",
    description: "Reflected XSS in username field",
    severity: "high",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useAnimatedNumber(target: number, enabled: boolean, duration = 700): number {
  const [value, setValue] = useState(enabled ? 0 : target);

  useEffect(() => {
    if (!enabled) {
      setValue(target);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, enabled, duration]);

  return value;
}

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-rose-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-blue-500",
  info: "bg-slate-500",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  scan: Radar,
  finding: AlertTriangle,
  agent: Zap,
  report: FileText,
};

const ACTIVITY_COLOR: Record<string, string> = {
  scan: "text-cyan-400 bg-cyan-500/10",
  finding: "text-rose-400 bg-rose-500/10",
  agent: "text-emerald-400 bg-emerald-500/10",
  report: "text-blue-400 bg-blue-500/10",
};

// ---------------------------------------------------------------------------
// Security Score Gauge (SVG)
// ---------------------------------------------------------------------------

function SecurityScoreGauge({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius; // half-circle
  const clamped = Math.max(0, Math.min(100, score));
  const filled = (clamped / 100) * circumference;

  const color =
    clamped >= 80
      ? "#22d3ee" // cyan
      : clamped >= 60
      ? "#eab308" // yellow
      : "#f43f5e"; // rose

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="80" viewBox="0 0 140 80" aria-label={`Security score: ${score}`}>
        {/* Background arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="#1e293b"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 1s ease, stroke 0.5s ease" }}
        />
        {/* Score text */}
        <text x="70" y="62" textAnchor="middle" className="fill-slate-100" fontSize="26" fontWeight="700" fill="white">
          {clamped}
        </text>
        <text x="70" y="76" textAnchor="middle" fontSize="11" fill="#94a3b8">
          / 100
        </text>
      </svg>
      <p className="mt-1 text-sm font-medium" style={{ color }}>
        {clamped >= 80 ? "Strong" : clamped >= 60 ? "Moderate" : "Needs Attention"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number | string;
  valueClassName?: string;
  icon: React.ElementType;
  iconClass: string;
  trend?: { value: number; label: string };
  to?: string;
  className?: string;
}

function StatCard({ label, value, valueClassName, icon: Icon, iconClass, trend, to, className }: StatCardProps) {
  const inner = (
    <div
      className={[
        "flex items-start justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700",
        className ?? "",
      ].join(" ")}
    >
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={["mt-1 text-2xl font-bold text-slate-100", valueClassName ?? ""].join(" ")}>{value}</p>
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
            <TrendingUp className="h-3 w-3" />
            <span>
              {trend.value > 0 ? "+" : ""}
              {trend.value} {trend.label}
            </span>
          </div>
        )}
      </div>
      <div className={`rounded-lg p-2 ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

// ---------------------------------------------------------------------------
// Quick Actions
// ---------------------------------------------------------------------------

function QuickActions() {
  const actions = [
    { label: "New Scan", desc: "Launch a security scan", icon: Play, to: "/scans", color: "from-cyan-500 to-blue-600" },
    { label: "Recon", desc: "OSINT & enumeration", icon: Globe, to: "/recon", color: "from-blue-500 to-purple-600" },
    { label: "AI Analysis", desc: "Correlate findings", icon: Brain, to: "/ai", color: "from-purple-500 to-pink-600" },
    { label: "Reports", desc: "Generate & export", icon: FileText, to: "/reports", color: "from-emerald-500 to-teal-600" },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a) => (
          <Link
            key={a.label}
            to={a.to}
            className="group flex min-h-12 items-center gap-3 rounded-lg border border-slate-800 bg-slate-950 p-3 transition-all hover:border-slate-700 hover:bg-slate-800"
          >
            <div className={`rounded-lg bg-gradient-to-br p-2 ${a.color}`}>
              <a.icon className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200">{a.label}</p>
              <p className="truncate text-[11px] text-slate-500">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform Modules
// ---------------------------------------------------------------------------

function PlatformModules() {
  const modules = [
    { name: "Scan Engine", status: "operational", icon: Radar, color: "text-cyan-400" },
    { name: "AI / Helix", status: "operational", icon: Brain, color: "text-purple-400" },
    { name: "Recon", status: "operational", icon: Globe, color: "text-blue-400" },
    { name: "Bug Bounty", status: "operational", icon: Bug, color: "text-rose-400" },
    { name: "Collaboration", status: "operational", icon: Users, color: "text-amber-400" },
    { name: "Notifications", status: "operational", icon: Activity, color: "text-emerald-400" },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Platform Modules</h3>
      <div className="space-y-2">
        {modules.map((m) => (
          <div key={m.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="text-sm text-slate-300">{m.name}</span>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {m.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<OverviewStats>(MOCK_STATS);
  const [activity, setActivity] = useState<RecentActivity[]>(MOCK_ACTIVITY);
  const [loading, setLoading] = useState(true);
  const [animateBars, setAnimateBars] = useState(false);

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    (async () => {
      try {
        const [statsRes, activityRes] = await Promise.allSettled([
          fetch(`${API}/api/dashboard/overview`, { headers }),
          fetch(`${API}/api/findings?limit=5`, { headers }),
        ]);

        if (statsRes.status === "fulfilled" && statsRes.value.ok) {
          const data = (await statsRes.value.json()) as OverviewStats;
          setStats(data);
        }

        if (activityRes.status === "fulfilled" && activityRes.value.ok) {
          const data = (await activityRes.value.json()) as { items?: RecentActivity[] };
          if (data.items?.length) setActivity(data.items);
        }
      } catch {
        // keep mock data
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (loading) {
      setAnimateBars(false);
      return;
    }
    const timer = window.setTimeout(() => setAnimateBars(true), 40);
    return () => window.clearTimeout(timer);
  }, [loading, stats.compliance_pct]);

  const totalScansCount = useAnimatedNumber(stats.total_scans, !loading);
  const criticalCount = useAnimatedNumber(stats.critical_findings, !loading);
  const activeAgentsCount = useAnimatedNumber(stats.active_agents, !loading);
  const openBugsCount = useAnimatedNumber(stats.open_bugs, !loading);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              {greeting()}, {user?.full_name?.split(" ")[0] ?? "there"} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Here's your security posture overview for today
            </p>
          </div>
          <Link
            to="/scans"
            className="flex min-h-11 items-center gap-2 self-start rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-400 sm:self-auto"
          >
            <Play className="h-4 w-4" />
            New Scan
          </Link>
        </div>

        {/* Top row — Security Score + Stats */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Security Score card (spans 1 column on lg) */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-5 sm:col-span-1 lg:col-span-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Security Score
            </p>
            <SecurityScoreGauge score={loading ? 0 : stats.security_score} />
          </div>

          {/* Stats cards (4 cols) */}
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:col-span-4">
            <div className="min-w-[220px] snap-start sm:min-w-0">
              <StatCard
                label="Total Scans"
                value={loading ? "…" : totalScansCount}
                valueClassName={loading ? undefined : "animate-count"}
                icon={Radar}
                iconClass="bg-cyan-500/10 text-cyan-400"
                trend={{ value: stats.scans_today, label: "today" }}
                to="/scans"
                className="animate-slide-in"
              />
            </div>
            <div className="min-w-[220px] snap-start sm:min-w-0">
              <StatCard
                label="Critical Findings"
                value={loading ? "…" : criticalCount}
                valueClassName={loading ? undefined : stats.critical_findings > 0 ? "animate-count animate-badge" : "animate-count"}
                icon={AlertTriangle}
                iconClass="bg-rose-500/10 text-rose-400"
                trend={{ value: stats.findings_last_7d, label: "last 7d" }}
                to="/timeline"
                className="animate-slide-in [animation-delay:60ms]"
              />
            </div>
            <div className="min-w-[220px] snap-start sm:min-w-0">
              <StatCard
                label="Active Agents"
                value={loading ? "…" : activeAgentsCount}
                valueClassName={loading ? undefined : "animate-count"}
                icon={Zap}
                iconClass="bg-emerald-500/10 text-emerald-400"
                className="animate-slide-in [animation-delay:120ms]"
              />
            </div>
            <div className="min-w-[220px] snap-start sm:min-w-0">
              <StatCard
                label="Open Bug Reports"
                value={loading ? "…" : openBugsCount}
                valueClassName={loading ? undefined : "animate-count"}
                icon={Bug}
                iconClass="bg-orange-500/10 text-orange-400"
                to="/bugbounty"
                className="animate-slide-in [animation-delay:180ms]"
              />
            </div>
          </div>
        </div>

        {/* Middle row — Compliance bar + Quick actions + Modules */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Compliance */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300">Compliance Readiness</h3>
              <Link to="/reports" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5">
                View report <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { label: "SOC 2", pct: loading ? 0 : stats.compliance_pct },
                { label: "PCI DSS", pct: loading ? 0 : Math.max(0, stats.compliance_pct - 8) },
                { label: "HIPAA", pct: loading ? 0 : Math.max(0, stats.compliance_pct - 15) },
              ].map(({ label, pct }) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>{label}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500"
                      }`}
                      style={{ width: `${animateBars ? pct : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <QuickActions />

          {/* Platform modules */}
          <PlatformModules />
        </div>

        {/* Bottom row — Recent activity */}
        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-300">Recent Activity</h3>
            <Link
              to="/timeline"
              className="flex items-center gap-0.5 text-xs text-cyan-400 hover:text-cyan-300"
            >
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-slate-800">
            {activity.map((ev, idx) => {
              const Icon = ACTIVITY_ICON[ev.type] ?? Activity;
              const colorClass = ACTIVITY_COLOR[ev.type] ?? "text-slate-400 bg-slate-800";
              return (
                <div
                  key={ev.id}
                  className="animate-slide-in flex items-start gap-3 px-4 py-3"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div className={`mt-0.5 flex-shrink-0 rounded-lg p-2 ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-slate-200">{ev.title}</p>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        {ev.severity && (
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${SEVERITY_DOT[ev.severity] ?? "bg-slate-500"}`}
                          />
                        )}
                        <span className="flex-shrink-0 text-xs text-slate-500">
                          <Clock className="mr-0.5 inline h-3 w-3" />
                          {relativeTime(ev.timestamp)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{ev.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
