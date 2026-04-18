import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button } from "../components/ui/button";
import { Pagination } from "../components/Pagination";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

type DashboardSnapshot = {
  timestamp: number;
  system_health: string;
  active_scans: number;
  user_activity: string;
  resource_utilization: {
    cpu: number;
    memory: number;
    network: number;
  };
};

type UserRecord = {
  id?: string;
  email: string;
  role: string;
  full_name?: string;
  is_active?: boolean;
};

type AuditRecord = {
  timestamp: string;
  action: string;
  actor: string;
  detail: string;
};

type PluginAuditRecord = {
  timestamp: string;
  action: string;
  plugin: string;
  detail: string;
  status?: string;
  actor?: string;
  actor_role?: string;
  context?: {
    scan_id?: string | null;
    target?: string;
    success?: boolean;
  };
};

type PluginRecord = {
  name: string;
  version: string;
  description: string;
  author: string;
  tags: string[];
  permissions?: string[];
  signature_verified?: boolean;
  signature_reason?: string;
  enabled?: boolean;
};

const API = getApiGatewayBaseUrl();

const DEMO_SNAPSHOT: DashboardSnapshot = {
  timestamp: Date.now(),
  system_health: "healthy",
  active_scans: 3,
  user_activity: "steady",
  resource_utilization: { cpu: 34, memory: 48, network: 12 },
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [pluginAudit, setPluginAudit] = useState<PluginAuditRecord[]>([]);
  const [pluginAuditScope, setPluginAuditScope] = useState<"admin" | "role" | "unknown">("unknown");
  const [pluginAuditQuery, setPluginAuditQuery] = useState("");
  const [pluginAuditAction, setPluginAuditAction] = useState("all");
  const [pluginAuditRole, setPluginAuditRole] = useState("all");
  const [pluginAuditStatus, setPluginAuditStatus] = useState("all");
  const [config, setConfig] = useState<Record<string, string>>({});
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [pluginRefreshMessage, setPluginRefreshMessage] = useState<string | null>(null);
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({
    scan: true,
    recon: true,
    report: true,
    ai: true,
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [reportValues, setReportValues] = useState<number[]>([3, 6, 4, 8, 5, 7]);
  const [userPage, setUserPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const PAGE_SIZE = 5;
  const AUDIT_PAGE_SIZE = 8;

  const [scanQueue] = useState<string[]>(["Network Scan", "Web Scan", "API Scan"]);
  const [scheduledScans, setScheduledScans] = useState<string[]>([]);

  const barWidth = useMemo(() => 30, []);
  const chartHeight = useMemo(() => 140, []);
  const pluginAuditFiltered = useMemo(() => {
    const query = pluginAuditQuery.trim().toLowerCase();
    return pluginAudit.filter((entry) => {
      if (pluginAuditAction !== "all" && entry.action !== pluginAuditAction) return false;
      if (pluginAuditRole !== "all" && (entry.actor_role ?? "system") !== pluginAuditRole)
        return false;
      if (pluginAuditStatus !== "all" && (entry.status ?? "ok") !== pluginAuditStatus) return false;
      if (
        query &&
        ![
          entry.timestamp,
          entry.action,
          entry.actor ?? "system",
          entry.actor_role ?? "system",
          entry.plugin,
          entry.detail,
          entry.context?.target ?? "",
          entry.context?.scan_id ?? "",
          entry.status ?? "ok",
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        return false;
      }
      return true;
    });
  }, [pluginAudit, pluginAuditAction, pluginAuditQuery, pluginAuditRole, pluginAuditStatus]);

  const pluginAuditSummary = useMemo(() => {
    const signed = plugins.filter((plugin) => plugin.signature_verified).length;
    const enabled = plugins.filter((plugin) => plugin.enabled !== false).length;
    const protectedPlugins = plugins.filter(
      (plugin) => (plugin.permissions?.length ?? 0) > 0,
    ).length;
    const trustScore = plugins.length > 0 ? Math.round((signed / plugins.length) * 100) : 0;
    return { signed, enabled, protectedPlugins, trustScore };
  }, [plugins]);

  const userPageCount = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const auditPageCount = Math.max(1, Math.ceil(audit.length / AUDIT_PAGE_SIZE));
  const pagedUsers = useMemo(
    () => users.slice((userPage - 1) * PAGE_SIZE, userPage * PAGE_SIZE),
    [users, userPage],
  );
  const pagedAudit = useMemo(
    () =>
      audit
        .slice()
        .reverse()
        .slice((auditPage - 1) * AUDIT_PAGE_SIZE, auditPage * AUDIT_PAGE_SIZE),
    [audit, auditPage],
  );

  const authHeaders = useMemo(() => {
    if (!token || token.startsWith("demo-preview") || user?.role === "demo_viewer") {
      return {} as Record<string, string>;
    }
    return { Authorization: `Bearer ${token}` };
  }, [token, user?.role]);

  useEffect(() => {
    if (!token || token.startsWith("demo-preview") || user?.role === "demo_viewer") {
      setSnapshot(DEMO_SNAPSHOT);
      return;
    }

    const wsBase = API.replace(/^http/, "ws") || `ws://${window.location.host}`;
    const ws = new WebSocket(`${wsBase}/ws/dashboard`);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DashboardSnapshot;
        setSnapshot(data);
      } catch {
        // no-op
      }
    };

    return () => ws.close();
  }, [token, user?.role]);

  const loadAdminData = async () => {
    if (!token || token.startsWith("demo-preview") || user?.role === "demo_viewer") {
      setUsers([]);
      setAudit([]);
      setPluginAudit([]);
      setConfig({});
      setPlugins([]);
      return;
    }

    const [usersRes, auditRes, configRes, pluginsRes, pluginAuditRes] = await Promise.all([
      fetch(`${API}/api/admin/users`, { headers: authHeaders }),
      fetch(`${API}/api/admin/audit-logs`, { headers: authHeaders }),
      fetch(`${API}/api/admin/config`, { headers: authHeaders }),
      fetch(`${API}/api/plugins`, { headers: authHeaders }),
      fetch(`${API}/api/plugins/audit?limit=20`, { headers: authHeaders }),
    ]);

    if (usersRes.ok) {
      const payload = (await usersRes.json()) as { items: UserRecord[] };
      setUsers(payload.items ?? []);
      setUserPage(1);
    }
    if (auditRes.ok) {
      const payload = (await auditRes.json()) as { items: AuditRecord[] };
      setAudit(payload.items ?? []);
      setAuditPage(1);
    }
    if (configRes.ok) {
      const payload = (await configRes.json()) as { config: Record<string, string> };
      setConfig(payload.config ?? {});
    }
    if (pluginsRes.ok) {
      const payload = (await pluginsRes.json()) as { plugins?: PluginRecord[] };
      setPlugins(payload.plugins ?? []);
      setPluginRefreshMessage(null);
    }
    if (pluginAuditRes.ok) {
      const payload = (await pluginAuditRes.json()) as {
        items?: PluginAuditRecord[];
        scope?: "admin" | "role";
      };
      setPluginAudit(payload.items ?? []);
      setPluginAuditScope(payload.scope ?? "unknown");
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, [token, user?.role, authHeaders]);

  useEffect(() => {
    setUserPage((page) => Math.min(page, Math.max(1, Math.ceil(users.length / PAGE_SIZE))));
  }, [users.length]);

  useEffect(() => {
    setAuditPage((page) => Math.min(page, Math.max(1, Math.ceil(audit.length / AUDIT_PAGE_SIZE))));
  }, [audit.length]);

  const createUser = async () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*";
    const buf = new Uint8Array(24);
    crypto.getRandomValues(buf);
    const tempPassword = Array.from(buf, (b) => alphabet[b % alphabet.length]).join("");

    const res = await fetch(`${API}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        email: newUserEmail,
        password: tempPassword,
        full_name: newUserEmail.split("@")[0] || "user",
        role: newUserRole,
      }),
    });

    if (res.ok) {
      window.alert(
        `User created!\n\nEmail: ${newUserEmail}\nTemporary password: ${tempPassword}\n\nPlease save this password — it will not be shown again.`,
      );
    }

    setNewUserEmail("");
    await loadAdminData();
  };

  const assignRole = async (email: string, role: string) => {
    await fetch(`${API}/api/admin/roles/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ email, role }),
    });
    await loadAdminData();
  };

  const refreshPlugins = async () => {
    if (!token || token.startsWith("demo-preview") || user?.role === "demo_viewer") return;
    setPluginRefreshMessage("Refreshing plugin registry…");
    const response = await fetch(`${API}/api/plugins/reload`, {
      method: "POST",
      headers: authHeaders,
    });
    if (response.ok) {
      setPluginRefreshMessage("Plugin registry refreshed.");
      await loadAdminData();
    } else {
      setPluginRefreshMessage("Plugin registry refresh failed.");
    }
  };

  const togglePlugin = async (name: string, enabled?: boolean) => {
    if (!token || token.startsWith("demo-preview") || user?.role === "demo_viewer") return;
    const endpoint = enabled ? "disable" : "enable";
    await fetch(`${API}/api/plugins/${encodeURIComponent(name)}/${endpoint}`, {
      method: "POST",
      headers: authHeaders,
    });
    await loadAdminData();
  };

  const toggleModule = (name: string) => {
    setModuleState((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const saveConfig = async (key: string, value: string) => {
    await fetch(`${API}/api/admin/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ key, value }),
    });
    await loadAdminData();
  };

  const exportPluginAudit = () => {
    const blob = new Blob([JSON.stringify(pluginAuditFiltered, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `cosmicsec-plugin-audit-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const onDropScan = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const scanName = e.dataTransfer.getData("text/plain");
    if (scanName && !scheduledScans.includes(scanName)) {
      setScheduledScans((prev) => [...prev, scanName]);
    }
  };

  return (
    <section className="space-y-8">
      <header className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="text-2xl font-semibold">Advanced Admin Dashboard</h2>
        <p className="text-sm text-slate-300">
          Realtime platform status, operations control, and governance tooling.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard title="System Health" value={snapshot?.system_health ?? "connecting..."} />
        <MetricCard title="Active Scans" value={String(snapshot?.active_scans ?? 0)} />
        <MetricCard title="User Activity" value={snapshot?.user_activity ?? "n/a"} />
        <MetricCard
          title="Resource"
          value={`CPU ${snapshot?.resource_utilization.cpu ?? 0}% | MEM ${snapshot?.resource_utilization.memory ?? 0}%`}
        />
      </div>

      <section className="rounded-2xl border border-cyan-500/20 bg-linear-to-br from-slate-900 to-slate-950 p-4 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Plugin Trust Console</h3>
            <p className="text-sm text-slate-400">
              Signed plugins, runtime permissions, and registry controls in one place.
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-cyan-600 hover:bg-cyan-500" onClick={() => void refreshPlugins()}>
              Refresh Registry
            </Button>
            <Button
              className="bg-slate-700 hover:bg-slate-600"
              onClick={() => void loadAdminData()}
            >
              Reload Snapshot
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <MetricCard title="Plugins" value={String(plugins.length)} />
          <MetricCard title="Signed" value={String(pluginAuditSummary.signed)} />
          <MetricCard title="Enabled" value={String(pluginAuditSummary.enabled)} />
          <MetricCard title="Protected" value={String(pluginAuditSummary.protectedPlugins)} />
        </div>
        {pluginRefreshMessage ? (
          <p className="mt-3 text-xs text-cyan-300">{pluginRefreshMessage}</p>
        ) : null}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {plugins.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-4 text-sm text-slate-500 lg:col-span-2">
              No plugins discovered yet.
            </div>
          ) : (
            plugins.map((plugin) => (
              <div
                key={plugin.name}
                className="rounded-xl border border-slate-800 bg-slate-950/80 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/plugins/${encodeURIComponent(plugin.name)}`}
                        className="text-base font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                      >
                        {plugin.name}
                      </Link>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${plugin.signature_verified ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}
                      >
                        {plugin.signature_verified ? "Signed" : "Unsigned"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${plugin.enabled !== false ? "bg-cyan-500/15 text-cyan-300" : "bg-slate-700 text-slate-300"}`}
                      >
                        {plugin.enabled !== false ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{plugin.description}</p>
                  </div>
                  <Button
                    className={
                      plugin.enabled !== false
                        ? "bg-rose-700 hover:bg-rose-600"
                        : "bg-emerald-600 hover:bg-emerald-500"
                    }
                    onClick={() => void togglePlugin(plugin.name, plugin.enabled)}
                  >
                    {plugin.enabled !== false ? "Disable" : "Enable"}
                  </Button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400 md:grid-cols-4">
                  <span>Version {plugin.version}</span>
                  <span>Author {plugin.author}</span>
                  <span>Permissions {(plugin.permissions?.length ?? 0) || 0}</span>
                  <span>Tags {plugin.tags?.length ?? 0}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(plugin.permissions ?? []).length > 0 ? (
                    plugin.permissions?.map((permission) => (
                      <span
                        key={`${plugin.name}-${permission}`}
                        className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                      >
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">No explicit permissions declared</span>
                  )}
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  {plugin.signature_reason ?? "Signature status unavailable"}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Plugin Trust Audit</h3>
            <p className="text-sm text-slate-400">
              Recent registry reloads, plugin enable/disable events, and execution history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
              {pluginAuditFiltered.length} visible / {pluginAudit.length} total
            </span>
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
              {pluginAuditScope === "admin"
                ? "Full audit scope"
                : pluginAuditScope === "role"
                  ? "Role-scoped audit"
                  : "Scope pending"}
            </span>
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
              Trust score {pluginAuditSummary.trustScore}%
            </span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr,0.75fr,0.75fr,0.75fr,auto]">
          <input
            value={pluginAuditQuery}
            onChange={(e) => setPluginAuditQuery(e.target.value)}
            placeholder="Search plugin audit…"
            className="min-h-10 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/50"
            aria-label="Search plugin audit"
          />
          <select
            value={pluginAuditAction}
            onChange={(e) => setPluginAuditAction(e.target.value)}
            className="min-h-10 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
            aria-label="Filter plugin audit action"
          >
            <option value="all">All actions</option>
            <option value="reload">Reload</option>
            <option value="enable">Enable</option>
            <option value="disable">Disable</option>
            <option value="run">Run</option>
          </select>
          <select
            value={pluginAuditStatus}
            onChange={(e) => setPluginAuditStatus(e.target.value)}
            className="min-h-10 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
            aria-label="Filter plugin audit status"
          >
            <option value="all">All statuses</option>
            <option value="ok">OK</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </select>
          <select
            value={pluginAuditRole}
            onChange={(e) => setPluginAuditRole(e.target.value)}
            className="min-h-10 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500/50"
            aria-label="Filter plugin audit role"
          >
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="operator">Operator</option>
            <option value="system">System</option>
          </select>
          <Button className="bg-slate-700 hover:bg-slate-600" onClick={exportPluginAudit}>
            Export Audit
          </Button>
        </div>
        <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Action</th>
                <th className="p-2">Plugin</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Role</th>
                <th className="p-2">Detail</th>
                <th className="p-2">Context</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {pluginAuditFiltered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-slate-500">
                    No audit events match the current filters.
                  </td>
                </tr>
              ) : (
                pluginAuditFiltered.map((entry, idx) => (
                  <tr
                    key={`${entry.timestamp}-${entry.plugin}-${idx}`}
                    className="border-t border-slate-800"
                  >
                    <td className="p-2 text-slate-400">{entry.timestamp}</td>
                    <td className="p-2 font-medium text-slate-200">{entry.action}</td>
                    <td className="p-2">
                      <button
                        onClick={() => navigate(`/plugins/${encodeURIComponent(entry.plugin)}`)}
                        className="text-cyan-300 hover:text-cyan-200"
                      >
                        {entry.plugin}
                      </button>
                    </td>
                    <td className="p-2 text-slate-300">{entry.actor ?? "system"}</td>
                    <td className="p-2 text-slate-300">{entry.actor_role ?? "system"}</td>
                    <td className="p-2 text-slate-400">{entry.detail}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {entry.context?.scan_id ? (
                          <button
                            onClick={() => navigate(`/scans/${entry.context?.scan_id}`)}
                            className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/30"
                          >
                            Scan
                          </button>
                        ) : null}
                        {entry.context?.target ? (
                          <span className="rounded border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">
                            {entry.context.target}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2 text-slate-300">{entry.status ?? "ok"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">User Management + RBAC</h3>
          <div className="mb-3 flex gap-2">
            <input
              className="rounded border border-slate-700 bg-slate-950 p-2"
              placeholder="new user email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <select
              className="rounded border border-slate-700 bg-slate-950 p-2"
              value={newUserRole}
              aria-label="Select role for new user"
              title="Select role for new user"
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={createUser}>Create</Button>
          </div>
          <ul className="space-y-2 text-sm">
            {pagedUsers.map((u) => (
              <li
                key={u.email}
                className="flex items-center justify-between rounded border border-slate-800 p-2"
              >
                <span>
                  {u.email} <span className="text-slate-400">({u.role})</span>
                </span>
                <div className="flex gap-2">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-500"
                    onClick={() => assignRole(u.email, "analyst")}
                  >
                    Analyst
                  </Button>
                  <Button
                    className="bg-violet-600 hover:bg-violet-500"
                    onClick={() => assignRole(u.email, "admin")}
                  >
                    Admin
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-center">
            <Pagination page={userPage} totalPages={userPageCount} onPageChange={setUserPage} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">Module Controls + Config Editor</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(moduleState).map(([name, enabled]) => (
              <Button
                key={name}
                className={
                  enabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-700 hover:bg-rose-600"
                }
                onClick={() => toggleModule(name)}
              >
                {name}: {enabled ? "enabled" : "disabled"}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input
                  readOnly
                  className="w-1/3 rounded border border-slate-700 bg-slate-950 p-2"
                  value={key}
                  aria-label={`Configuration key ${key}`}
                  title={`Configuration key ${key}`}
                />
                <input
                  className="w-2/3 rounded border border-slate-700 bg-slate-950 p-2"
                  value={value}
                  aria-label={`Configuration value for ${key}`}
                  title={`Configuration value for ${key}`}
                  onChange={(e) => setConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                  onBlur={() => saveConfig(key, config[key])}
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">Scan Management (Drag & Drop)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-slate-800 p-3">
              <h4 className="mb-2 text-sm font-medium text-slate-300">Available scans</h4>
              {scanQueue.map((scan) => (
                <div
                  key={scan}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", scan)}
                  className="mb-2 cursor-move rounded bg-slate-800 p-2 text-sm"
                >
                  {scan}
                </div>
              ))}
            </div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropScan}
              className="rounded border border-dashed border-indigo-500 p-3"
            >
              <h4 className="mb-2 text-sm font-medium text-indigo-300">Scheduled scans</h4>
              {scheduledScans.length === 0 ? (
                <p className="text-xs text-slate-400">Drop scan types here</p>
              ) : (
                scheduledScans.map((scan) => (
                  <div key={scan} className="mb-2 rounded bg-indigo-950 p-2 text-sm">
                    {scan}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">Interactive Vulnerability Report</h3>
          <svg
            width={reportValues.length * (barWidth + 12)}
            height={chartHeight}
            className="rounded bg-slate-950 p-2"
          >
            {reportValues.map((value, i) => {
              const h = value * 12;
              const x = i * (barWidth + 12);
              const y = chartHeight - h - 12;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={barWidth} height={h} rx={4} fill="#6366f1" />
                  <text x={x + 8} y={chartHeight - 2} fill="#cbd5e1" fontSize="10">
                    S{i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <Button
            className="mt-3"
            onClick={() => setReportValues((prev) => prev.map((v) => Math.max(2, (v + 1) % 10)))}
          >
            Refresh chart
          </Button>
        </section>
      </div>

      <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h3 className="mb-3 text-lg font-semibold">Audit Log Viewer</h3>
        <div className="max-h-60 overflow-auto rounded border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-300">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Action</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {pagedAudit.map((entry, idx) => (
                  <tr key={`${entry.timestamp}-${idx}`} className="border-t border-slate-800">
                    <td className="p-2">{entry.timestamp}</td>
                    <td className="p-2">{entry.action}</td>
                    <td className="p-2">{entry.actor}</td>
                    <td className="p-2">{entry.detail}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
          <div className="mt-4 flex justify-center">
            <Pagination page={auditPage} totalPages={auditPageCount} onPageChange={setAuditPage} />
          </div>
      </section>
    </section>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-xs uppercase tracking-wide text-slate-400">{title}</h3>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
