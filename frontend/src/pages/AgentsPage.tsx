import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
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

interface AgentApiRecord {
  agent_id?: string;
  status?: string;
  last_seen_at?: number;
  registered_at?: number;
  manifest?: {
    hostname?: string;
    platform?: string;
    tools?: Array<string | { name?: string }>;
    tasks_completed?: number;
    version?: string;
  };
}

interface AgentTaskRecord {
  task_id: string;
  tool: string;
  target: string;
  status: string;
  progress?: number;
  message?: string;
  created_at: number;
  updated_at?: number;
  result?: {
    success?: boolean;
    findings_count?: number;
    output?: unknown;
    error?: string;
  };
}

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

function relativeUnixTime(epochSeconds?: number): string {
  if (!epochSeconds) return "unknown";
  return relativeTime(new Date(epochSeconds * 1000).toISOString());
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

const TASK_STATUS_STYLE: Record<string, string> = {
  dispatched: "bg-blue-500/10 text-blue-300 border-blue-400/20",
  accepted: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20",
  running: "bg-amber-500/10 text-amber-300 border-amber-400/20",
  completed: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
  failed: "bg-rose-500/10 text-rose-300 border-rose-400/20",
  rejected: "bg-orange-500/10 text-orange-300 border-orange-400/20",
  dispatch_failed: "bg-rose-500/10 text-rose-300 border-rose-400/20",
};

// ---------------------------------------------------------------------------
// Agent card
// ---------------------------------------------------------------------------

function AgentCard({
  agent,
  onDispatch,
  dispatching,
  onViewHistory,
  viewingHistory,
}: {
  agent: Agent;
  onDispatch: (agent: Agent) => void;
  dispatching: boolean;
  onViewHistory: (agent: Agent) => void;
  viewingHistory: boolean;
}) {
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
          <button
            onClick={() => onDispatch(agent)}
            disabled={dispatching}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dispatching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {dispatching ? "Dispatching..." : "Dispatch task"}
          </button>
          <button
            onClick={() => onViewHistory(agent)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
          >
            {viewingHistory ? "Hide history" : "Task history"}
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
  const { token, user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dispatchingAgentId, setDispatchingAgentId] = useState<string | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<
    "all" | "dispatched" | "accepted" | "running" | "completed" | "failed"
  >("all");
  const [taskHistory, setTaskHistory] = useState<AgentTaskRecord[]>([]);
  const [taskHistoryTotal, setTaskHistoryTotal] = useState(0);
  const [taskHistoryOffset, setTaskHistoryOffset] = useState(0);
  const [taskHistoryLoading, setTaskHistoryLoading] = useState(false);
  const [taskHistoryError, setTaskHistoryError] = useState<string | null>(null);

  const normalizeStatus = (status?: string): Agent["status"] => {
    if (status === "connected") return "online";
    if (status === "registered") return "idle";
    return "offline";
  };

  const toToolNames = (manifest: AgentApiRecord["manifest"]): string[] => {
    const tools = manifest?.tools;
    if (!Array.isArray(tools)) return [];
    return tools
      .map((tool) => (typeof tool === "string" ? tool : (tool?.name ?? "")))
      .filter((name) => Boolean(name));
  };

  const loadAgents = useCallback(
    async (showLoader = false) => {
      if (showLoader) setRefreshing(true);
      setLoadError(null);

      if (!token || user?.role === "demo_viewer") {
        setAgents([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API}/api/agents`, { headers });
        if (res.ok) {
          const data = (await res.json()) as { agents?: AgentApiRecord[] };
          const normalized = (data.agents ?? []).map((agent, index): Agent => {
            const lastSeenMs =
              typeof agent.last_seen_at === "number"
                ? agent.last_seen_at * 1000
                : typeof agent.registered_at === "number"
                  ? agent.registered_at * 1000
                  : Date.now();
            const tools = toToolNames(agent.manifest);
            return {
              agent_id: agent.agent_id ?? `agent-${index}`,
              hostname: agent.manifest?.hostname ?? "Unknown host",
              platform: agent.manifest?.platform ?? "unknown",
              tools,
              status: normalizeStatus(agent.status),
              last_seen: new Date(lastSeenMs).toISOString(),
              tasks_completed: agent.manifest?.tasks_completed ?? 0,
              version: agent.manifest?.version,
            };
          });
          setAgents(normalized);
          setLoading(false);
          setRefreshing(false);
          return;
        }
        setLoadError("Failed to load agents from server.");
      } catch {
        setLoadError("Failed to load agents from server.");
      }

      setAgents([]);
      setLoading(false);
      setRefreshing(false);
    },
    [token, user?.role],
  );

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const loadTaskHistory = useCallback(
    async (
      agentId: string,
      options?: {
        reset?: boolean;
        nextOffset?: number;
      },
    ) => {
      if (!token) return;
      const reset = Boolean(options?.reset);
      const nextOffset = options?.nextOffset ?? (reset ? 0 : taskHistoryOffset);

      setTaskHistoryLoading(true);
      setTaskHistoryError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        params.set("offset", String(nextOffset));
        if (taskFilter !== "all") {
          params.set("status", taskFilter);
        }

        const res = await fetch(`${API}/api/agents/${agentId}/tasks?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to load agent tasks");
        }

        const data = (await res.json()) as {
          tasks?: AgentTaskRecord[];
          total?: number;
          offset?: number;
        };

        const incoming = Array.isArray(data.tasks) ? data.tasks : [];
        setTaskHistory((prev) => (reset ? incoming : [...prev, ...incoming]));
        setTaskHistoryTotal(data.total ?? incoming.length);
        setTaskHistoryOffset((data.offset ?? nextOffset) + incoming.length);
      } catch {
        setTaskHistoryError("Unable to load task history.");
      } finally {
        setTaskHistoryLoading(false);
      }
    },
    [taskFilter, taskHistoryOffset, token],
  );

  useEffect(() => {
    if (!selectedAgentId) return;
    void loadTaskHistory(selectedAgentId, { reset: true, nextOffset: 0 });
  }, [loadTaskHistory, selectedAgentId, taskFilter]);

  const onlineCount = agents.filter((a) => a.status === "online").length;
  const idleCount = agents.filter((a) => a.status === "idle").length;

  const dispatchQuickTask = useCallback(
    async (agent: Agent) => {
      if (!token) return;
      setDispatchingAgentId(agent.agent_id);
      setDispatchStatus(null);
      try {
        const res = await fetch(`${API}/api/agents/${agent.agent_id}/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tool: "nmap",
            target: "127.0.0.1",
            args: ["-sV"],
            metadata: { source: "agents-page-quick-dispatch" },
          }),
        });
        if (!res.ok) {
          setDispatchStatus("Failed to dispatch task.");
          return;
        }
        const data = (await res.json()) as { task_id?: string };
        setDispatchStatus(
          `Task dispatched successfully${data.task_id ? ` (${data.task_id})` : ""}.`,
        );
        if (selectedAgentId === agent.agent_id) {
          void loadTaskHistory(agent.agent_id, { reset: true, nextOffset: 0 });
        }
      } catch {
        setDispatchStatus("Failed to dispatch task.");
      } finally {
        setDispatchingAgentId(null);
      }
    },
    [loadTaskHistory, selectedAgentId, token],
  );

  const selectedAgent = selectedAgentId ? agents.find((a) => a.agent_id === selectedAgentId) : null;

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

        {loadError ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {loadError}
          </div>
        ) : null}

        {dispatchStatus ? (
          <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-200">
            {dispatchStatus}
          </div>
        ) : null}

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
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              No connected agents found for your account. Connect an agent to run live tools and see
              execution outputs.
            </div>
            <InstallBanner />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {agents.map((a) => (
              <AgentCard
                key={a.agent_id}
                agent={a}
                onDispatch={dispatchQuickTask}
                dispatching={dispatchingAgentId === a.agent_id}
                onViewHistory={(agent) => {
                  if (selectedAgentId === agent.agent_id) {
                    setSelectedAgentId(null);
                    setTaskHistory([]);
                    setTaskHistoryOffset(0);
                    setTaskHistoryTotal(0);
                    return;
                  }
                  setSelectedAgentId(agent.agent_id);
                  setTaskHistory([]);
                  setTaskHistoryOffset(0);
                  setTaskHistoryTotal(0);
                }}
                viewingHistory={selectedAgentId === a.agent_id}
              />
            ))}
          </div>
        )}

        {selectedAgent ? (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">Task History</h2>
                <p className="text-xs text-slate-500">
                  {selectedAgent.hostname} · {taskHistoryTotal} task(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500" htmlFor="task-status-filter">
                  Status
                </label>
                <select
                  id="task-status-filter"
                  value={taskFilter}
                  onChange={(e) => {
                    setTaskFilter(
                      e.target.value as
                        | "all"
                        | "dispatched"
                        | "accepted"
                        | "running"
                        | "completed"
                        | "failed",
                    );
                  }}
                  className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-200"
                >
                  <option value="all">All</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="accepted">Accepted</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {taskHistoryError ? (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {taskHistoryError}
              </div>
            ) : null}

            {taskHistory.length === 0 && !taskHistoryLoading ? (
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-4 text-xs text-slate-500">
                No task history available for the selected filter.
              </div>
            ) : (
              <div className="space-y-2">
                {taskHistory.map((task) => (
                  <article
                    key={task.task_id}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-cyan-300">{task.tool}</span>
                        <span className="text-xs text-slate-500">{task.target}</span>
                      </div>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${TASK_STATUS_STYLE[task.status] ?? "bg-slate-700/40 text-slate-300 border-slate-600"}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>Created {relativeUnixTime(task.created_at)}</span>
                      <span>Progress {Math.max(0, Math.min(task.progress ?? 0, 100))}%</span>
                    </div>

                    {task.message ? (
                      <p className="mt-1 text-xs text-slate-300">{task.message}</p>
                    ) : null}
                    {task.result?.error ? (
                      <p className="mt-1 text-xs text-rose-300">{task.result.error}</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!selectedAgentId || taskHistoryLoading) return;
                  void loadTaskHistory(selectedAgentId, {
                    reset: false,
                    nextOffset: taskHistoryOffset,
                  });
                }}
                disabled={taskHistoryLoading || taskHistory.length >= taskHistoryTotal}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {taskHistoryLoading ? "Loading..." : "Load more"}
              </button>
            </div>
          </section>
        ) : null}

        {agents.length > 0 && <InstallBanner />}
      </div>
    </AppLayout>
  );
}
