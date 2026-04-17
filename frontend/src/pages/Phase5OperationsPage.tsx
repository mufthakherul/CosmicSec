import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import {
  fetchBugBountyEarnings,
  fetchPhase5Alerts,
  fetchPhase5CIGateStatus,
  fetchPhase5Incidents,
  fetchPhase5RiskPosture,
  fetchPhase5SocDashboard,
  fetchPhase5SocMetrics,
  type AlertFeedItem,
  type CIGateStatusItem,
  type IncidentTimelineItem,
} from "../services/phase5Api";

const MOCK_ALERTS: AlertFeedItem[] = [
  {
    id: "alt-1",
    source: "SIEM",
    severity: "critical",
    title: "Multiple privilege escalation attempts detected",
    status: "open",
    created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-2",
    source: "EDR",
    severity: "high",
    title: "Suspicious process injection on app-server-02",
    status: "investigating",
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: "alt-3",
    source: "WAF",
    severity: "medium",
    title: "SQLi probing burst blocked at API edge",
    status: "open",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_INCIDENTS: IncidentTimelineItem[] = [
  {
    id: "inc-101",
    title: "Credential stuffing campaign",
    severity: "high",
    status: "investigating",
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inc-102",
    title: "Public S3 bucket exposure",
    severity: "critical",
    status: "resolved",
    timestamp: new Date(Date.now() - 46 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "inc-103",
    title: "Outbound C2 beacon anomaly",
    severity: "medium",
    status: "open",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const MOCK_CI_GATES: CIGateStatusItem[] = [
  {
    id: "ci-1",
    pipeline: "frontend-security-checks",
    branch: "main",
    status: "pass",
    runtime_seconds: 271,
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: "ci-2",
    pipeline: "backend-codeql",
    branch: "main",
    status: "fail",
    runtime_seconds: 488,
    updated_at: new Date(Date.now() - 95 * 60 * 1000).toISOString(),
  },
  {
    id: "ci-3",
    pipeline: "dependency-audit",
    branch: "release/next",
    status: "running",
    runtime_seconds: 132,
    updated_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
  },
];

const MOCK_MONTHLY_EARNINGS = [
  { month: "Jan", amount: 2400 },
  { month: "Feb", amount: 3900 },
  { month: "Mar", amount: 4600 },
  { month: "Apr", amount: 5200 },
  { month: "May", amount: 6100 },
  { month: "Jun", amount: 5700 },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusClass(status: "open" | "investigating" | "resolved") {
  if (status === "resolved") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  if (status === "investigating") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-rose-500/15 text-rose-300 border-rose-500/30";
}

function severityClass(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return "text-rose-400";
  if (severity === "high") return "text-orange-400";
  if (severity === "medium") return "text-amber-400";
  return "text-cyan-400";
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 56;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const filled = (clamped / 100) * circumference;
  const color = clamped >= 80 ? "#22d3ee" : clamped >= 60 ? "#eab308" : "#f43f5e";

  return (
    <svg width="164" height="92" viewBox="0 0 164 92" aria-label={`Risk posture score ${clamped}`}>
      <path
        d="M 12 84 A 70 70 0 0 1 152 84"
        fill="none"
        stroke="#1e293b"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 12 84 A 70 70 0 0 1 152 84"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      <text x="82" y="64" textAnchor="middle" fontSize="28" fontWeight="700" fill="#f8fafc">
        {clamped}
      </text>
      <text x="82" y="80" textAnchor="middle" fontSize="11" fill="#94a3b8">
        / 100
      </text>
    </svg>
  );
}

function TrendChart({ values }: { values: number[] }) {
  const width = 340;
  const height = 120;
  const padding = 12;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / (values.length - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-label="Risk trend chart"
    >
      <polyline fill="none" stroke="#334155" strokeWidth="1" points={`12,108 328,108`} />
      <polyline fill="none" stroke="#22d3ee" strokeWidth="2.5" points={points} />
    </svg>
  );
}

function MobileTopologyMap() {
  const [scale, setScale] = useState(1);
  const pinchDistanceRef = useRef<number | null>(null);

  const clampScale = (value: number) => Math.max(0.8, Math.min(2.2, value));

  const onTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinchDistanceRef.current === null) {
      pinchDistanceRef.current = distance;
      return;
    }
    const ratio = distance / pinchDistanceRef.current;
    setScale((previous) => clampScale(previous * ratio));
    pinchDistanceRef.current = distance;
  };

  const onTouchEnd = () => {
    pinchDistanceRef.current = null;
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Network Topology (Pinch Zoom)</h2>
        <span className="text-xs text-slate-500">{Math.round(scale * 100)}%</span>
      </div>
      <div
        className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 md:hidden"
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <svg width="100%" height="180" viewBox="0 0 320 180" aria-label="Network topology map">
          <g transform={`translate(30 8) scale(${scale})`}>
            <line x1="32" y1="70" x2="120" y2="30" stroke="#334155" strokeWidth="2" />
            <line x1="32" y1="70" x2="120" y2="110" stroke="#334155" strokeWidth="2" />
            <line x1="120" y1="30" x2="220" y2="70" stroke="#334155" strokeWidth="2" />
            <line x1="120" y1="110" x2="220" y2="70" stroke="#334155" strokeWidth="2" />
            <circle cx="32" cy="70" r="16" fill="#0f172a" stroke="#22d3ee" strokeWidth="2" />
            <circle cx="120" cy="30" r="14" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="120" cy="110" r="14" fill="#0f172a" stroke="#a78bfa" strokeWidth="2" />
            <circle cx="220" cy="70" r="16" fill="#0f172a" stroke="#34d399" strokeWidth="2" />
          </g>
        </svg>
      </div>
      <p className="mt-2 text-xs text-slate-500 md:hidden">
        Use two fingers to zoom the topology map.
      </p>
      <p className="mt-2 hidden text-xs text-slate-500 md:block">
        Pinch zoom is available on mobile touch devices.
      </p>
    </div>
  );
}

export function Phase5OperationsPage() {
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState<string[]>([]);

  const riskPosture = useQuery({
    queryKey: ["phase5-risk-posture"],
    queryFn: fetchPhase5RiskPosture,
  });
  const socDashboard = useQuery({
    queryKey: ["phase5-soc-dashboard"],
    queryFn: fetchPhase5SocDashboard,
  });
  const socMetrics = useQuery({ queryKey: ["phase5-soc-metrics"], queryFn: fetchPhase5SocMetrics });
  const alerts = useQuery({
    queryKey: ["phase5-alerts"],
    queryFn: fetchPhase5Alerts,
    retry: false,
  });
  const incidents = useQuery({
    queryKey: ["phase5-incidents"],
    queryFn: fetchPhase5Incidents,
    retry: false,
  });
  const ciGate = useQuery({
    queryKey: ["phase5-ci-gate"],
    queryFn: fetchPhase5CIGateStatus,
    retry: false,
  });
  const bountyEarnings = useQuery({
    queryKey: ["phase5-bugbounty-earnings"],
    queryFn: fetchBugBountyEarnings,
  });

  const riskScore = riskPosture.data?.overall_security_score ?? 79;
  const riskTrendValues = useMemo(() => {
    const seed = [62, 64, 63, 67, 69, 71, 70, 73, 75, 74, 76, 77, 79];
    const offset = Math.max(-8, Math.min(10, riskScore - 79));
    return seed.map((value) => Math.max(0, Math.min(100, value + Math.round(offset * 0.6))));
  }, [riskScore]);

  const liveAlerts = (alerts.data ?? MOCK_ALERTS).filter(
    (alert) => !dismissedAlertIds.includes(alert.id),
  );
  const timelineIncidents = incidents.data ?? MOCK_INCIDENTS;
  const ciRows = ciGate.data ?? MOCK_CI_GATES;
  const monthlyEarnings = bountyEarnings.data?.monthly_earnings ?? MOCK_MONTHLY_EARNINGS;

  const openIncidents = timelineIncidents.filter(
    (incident) => incident.status !== "resolved",
  ).length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const closedThisWeek = timelineIncidents.filter(
    (incident) =>
      incident.status === "resolved" && new Date(incident.timestamp).getTime() >= weekAgo,
  ).length;
  const maxMonthlyEarning = Math.max(...monthlyEarnings.map((entry) => entry.amount), 1);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-100">Phase 5 SOC Operations</h1>
          <p className="text-sm text-slate-400">
            Unified command center for risk posture, SOC operations, incidents, CI gates, and bug
            bounty performance.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-200">Executive Risk Posture</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-[170px_1fr] sm:items-center">
              <div className="mx-auto">
                <ScoreGauge score={riskScore} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-400">Risk trend (last 30 days)</p>
                <TrendChart values={riskTrendValues} />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Benchmark percentile: {riskPosture.data?.industry_benchmark_percentile ?? 68}%
                  </span>
                  <span className="inline-flex items-center gap-1 text-cyan-300">
                    <TrendingUp className="h-3 w-3" />
                    {riskPosture.data?.trend ?? "improving"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">SOC Metrics</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="px-3 py-2 text-slate-400">MTTD</td>
                    <td className="px-3 py-2 text-slate-200">
                      {socMetrics.data?.mttd_minutes ?? 14} min
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">MTTR</td>
                    <td className="px-3 py-2 text-slate-200">
                      {socMetrics.data?.mttr_minutes ?? 42} min
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Open incidents</td>
                    <td className="px-3 py-2 text-slate-200">{openIncidents}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-slate-400">Closed this week</td>
                    <td className="px-3 py-2 text-slate-200">{closedThisWeek}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Total alerts: {socDashboard.data?.total_alerts ?? 32} · Critical:{" "}
              {socDashboard.data?.critical_alerts ?? 6} · Avg priority:{" "}
              {socDashboard.data?.average_priority ?? 74}
            </p>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold text-slate-200">Active Alerts</h2>
            </div>
            <div className="space-y-2">
              {liveAlerts.map((alert) => (
                <article
                  key={alert.id}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${severityClass(alert.severity)}`}>
                      {alert.title}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(alert.status)}`}
                    >
                      {acknowledgedAlertIds.includes(alert.id) ? "acknowledged" : alert.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {alert.source} · {relativeTime(alert.created_at)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setAcknowledgedAlertIds((previous) => [...new Set([...previous, alert.id])])
                      }
                      className="rounded-md border border-cyan-500/40 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-500/10"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDismissedAlertIds((previous) => [...new Set([...previous, alert.id])])
                      }
                      className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!alerts.data && alerts.error ? (
              <p className="mt-3 text-xs text-amber-300">
                Live alert feed unavailable; showing cached SOC snapshot.
              </p>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">Incident Timeline</h2>
            </div>
            <div className="space-y-3">
              {timelineIncidents.map((incident) => (
                <div key={incident.id} className="relative pl-6">
                  <span className="absolute left-1.5 top-1 h-full w-px bg-slate-700" aria-hidden />
                  <span
                    className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ${severityClass(incident.severity).replace("text", "bg")}`}
                  />
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-200">{incident.title}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase ${statusClass(incident.status)}`}
                      >
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{relativeTime(incident.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200">DevSecOps CI Gate Status</h2>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/60 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Pipeline</th>
                    <th className="px-3 py-2">Branch</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Runtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ciRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-slate-200">{row.pipeline}</td>
                      <td className="px-3 py-2 text-slate-400">{row.branch}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${
                            row.status === "pass"
                              ? "bg-emerald-500/15 text-emerald-300"
                              : row.status === "fail"
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-amber-500/15 text-amber-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {Math.round(row.runtime_seconds / 60)} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Bug Bounty Earnings</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-6 items-end gap-2">
                {monthlyEarnings.map((entry) => (
                  <div key={entry.month} className="flex flex-col items-center gap-1">
                    <div className="h-24 w-full rounded bg-slate-800">
                      <div
                        className="w-full rounded bg-cyan-500 transition-all"
                        style={{
                          height: `${Math.max(8, Math.round((entry.amount / maxMonthlyEarning) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{entry.month}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs text-slate-400">Total payout</p>
                <p className="text-xl font-bold text-cyan-300">
                  ${(bountyEarnings.data?.total_paid ?? 27950).toLocaleString()}
                </p>
              </div>
            </div>
          </section>
        </div>

        <MobileTopologyMap />
      </div>
    </AppLayout>
  );
}
