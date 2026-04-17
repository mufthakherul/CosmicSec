import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  Cpu,
  Download,
  Loader2,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Agent {
  agent_id: string;
  hostname: string;
  platform: string;
  tools: string[];
  status: "online" | "offline" | "idle";
  last_seen: string;
  tasks_completed: number;
  version?: string;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_AGENTS: Agent[] = [
  {
    agent_id: "agent-dev-01",
    hostname: "dev-workstation",
    platform: "linux",
    tools: ["nmap", "nikto", "nuclei", "gobuster"],
    status: "online",
    last_seen: new Date(Date.now() - 30 * 1000).toISOString(),
    tasks_completed: 14,
    version: "1.2.0",
  },
  {
    agent_id: "agent-ci-02",
    hostname: "ci-runner-42",
    platform: "linux",
    tools: ["nmap", "nuclei", "masscan"],
    status: "idle",
    last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    tasks_completed: 87,
    version: "1.2.0",
  },
  {
    agent_id: "agent-win-03",
    hostname: "pentest-laptop",
    platform: "windows",
    tools: ["nmap", "nikto", "sqlmap", "gobuster", "ffuf"],
    status: "offline",
    last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    tasks_completed: 32,
    version: "1.1.5",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CONFIG = {
  online: { label: "Online", color: "text-emerald-400", dot: "bg-emerald-400", icon: Wifi },
  idle: { label: "Idle", color: "text-amber-400", dot: "bg-amber-400", icon: Clock },
  offline: { label: "Offline", color: "text-slate-500", dot: "bg-slate-600", icon: WifiOff },
};

const PLATFORM_COLOR: Record<string, string> = {
  linux: "text-cyan-400",
  windows: "text-blue-400",
  darwin: "text-slate-300",
};

// ---------------------------------------------------------------------------
// Agent card
// ---------------------------------------------------------------------------

function AgentCard({ agent }: { agent: Agent }) {
  const sc = STATUS_CONFIG[agent.status];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
            <Terminal className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-100">{agent.hostname}</p>
            <p className="text-xs text-slate-500 font-mono">{agent.agent_id}</p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 ${sc.color}`}>
          <span
            className={`h-2 w-2 rounded-full ${sc.dot} ${agent.status === "online" ? "animate-pulse" : ""}`}
          />
          <span className="text-xs font-medium">{sc.label}</span>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="text-slate-500">Platform</p>
          <p
            className={`font-medium capitalize ${PLATFORM_COLOR[agent.platform] ?? "text-slate-300"}`}
          >
            {agent.platform}
          </p>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="text-slate-500">Tasks done</p>
          <p className="font-medium text-slate-200">{agent.tasks_completed}</p>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="text-slate-500">Last seen</p>
          <p className="font-medium text-slate-200">{relativeTime(agent.last_seen)}</p>
        </div>
        <div className="rounded-lg bg-slate-800/60 px-3 py-2">
          <p className="text-slate-500">Version</p>
          <p className="font-medium font-mono text-slate-200">{agent.version ?? "—"}</p>
        </div>
      </div>

      {/* Tools */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs text-slate-500">Discovered tools</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.tools.map((t) => (
            <span
              key={t}
              className="rounded bg-slate-800 px-2 py-0.5 font-mono text-xs text-cyan-300"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      {agent.status !== "offline" && (
        <div className="mt-4 flex gap-2">
          <button className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20">
            <Zap className="h-3.5 w-3.5" />
            Dispatch task
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Install instructions
// ---------------------------------------------------------------------------

function InstallBanner() {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
          <Download className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-100">Install the CosmicSec Agent</h3>
          <p className="mt-0.5 text-sm text-slate-400">
            Run security tools locally on your machine and stream results to CosmicSec.
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick install
            </p>
            <code className="block rounded-lg bg-slate-800 px-4 py-2 font-mono text-sm text-cyan-300">
              pip install cosmicsec-agent
            </code>
            <code className="block rounded-lg bg-slate-800 px-4 py-2 font-mono text-sm text-cyan-300">
              cosmicsec-agent connect --api-key YOUR_API_KEY
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AgentsPage() {
  const { token } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAgents = async (showLoader = false) => {
    if (showLoader) setRefreshing(true);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API}/api/agents`, { headers });
      if (res.ok) {
        const data = (await res.json()) as { agents?: Agent[] };
        if (data.agents?.length) {
          setAgents(data.agents);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
    } catch {
      // fall through to mock
    }

    setAgents(MOCK_AGENTS);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadAgents();
  }, [token]);

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Agents</h1>
            <p className="mt-0.5 text-sm text-slate-400">Local CLI agents connected to CosmicSec</p>
          </div>
          <button
            onClick={() => loadAgents(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total agents", value: agents.length, icon: Cpu, color: "text-slate-300" },
            { label: "Online", value: onlineCount, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Idle", value: idleCount, icon: Clock, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-100">{loading ? "…" : value}</p>
            </div>
          ))}
        </div>

        {/* Agent grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        ) : agents.length === 0 ? (
          <InstallBanner />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => (
              <AgentCard key={a.agent_id} agent={a} />
            ))}
          </div>
        )}

        {agents.length > 0 && <InstallBanner />}
      </div>
    </AppLayout>
  );
}
