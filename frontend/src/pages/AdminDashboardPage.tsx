import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button } from "../components/ui/button";

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

const API = "http://localhost:8000";

export function AdminDashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [moduleState, setModuleState] = useState<Record<string, boolean>>({
    scan: true,
    recon: true,
    report: true,
    ai: true,
  });

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [reportValues, setReportValues] = useState<number[]>([3, 6, 4, 8, 5, 7]);

  const [scanQueue, setScanQueue] = useState<string[]>(["Network Scan", "Web Scan", "API Scan"]);
  const [scheduledScans, setScheduledScans] = useState<string[]>([]);

  const barWidth = useMemo(() => 30, []);
  const chartHeight = useMemo(() => 140, []);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/dashboard");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as DashboardSnapshot;
        setSnapshot(data);
      } catch {
        // no-op
      }
    };

    return () => ws.close();
  }, []);

  const loadAdminData = async () => {
    const [usersRes, auditRes, configRes] = await Promise.all([
      fetch(`${API}/api/admin/users`),
      fetch(`${API}/api/admin/audit-logs`),
      fetch(`${API}/api/admin/config`),
    ]);

    if (usersRes.ok) {
      const payload = (await usersRes.json()) as { items: UserRecord[] };
      setUsers(payload.items ?? []);
    }
    if (auditRes.ok) {
      const payload = (await auditRes.json()) as { items: AuditRecord[] };
      setAudit(payload.items ?? []);
    }
    if (configRes.ok) {
      const payload = (await configRes.json()) as { config: Record<string, string> };
      setConfig(payload.config ?? {});
    }
  };

  useEffect(() => {
    void loadAdminData();
  }, []);

  const createUser = async () => {
    await fetch(`${API}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newUserEmail,
        password: "ChangeMe123!",
        full_name: newUserEmail.split("@")[0] || "user",
        role: newUserRole,
      }),
    });
    setNewUserEmail("");
    await loadAdminData();
  };

  const assignRole = async (email: string, role: string) => {
    await fetch(`${API}/api/admin/roles/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    await loadAdminData();
  };

  const toggleModule = (name: string) => {
    setModuleState((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const saveConfig = async (key: string, value: string) => {
    await fetch(`${API}/api/admin/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    await loadAdminData();
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
        <p className="text-sm text-slate-300">Realtime platform status, operations control, and governance tooling.</p>
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
              onChange={(e) => setNewUserRole(e.target.value)}
            >
              <option value="user">user</option>
              <option value="analyst">analyst</option>
              <option value="admin">admin</option>
            </select>
            <Button onClick={createUser}>Create</Button>
          </div>
          <ul className="space-y-2 text-sm">
            {users.map((u) => (
              <li key={u.email} className="flex items-center justify-between rounded border border-slate-800 p-2">
                <span>
                  {u.email} <span className="text-slate-400">({u.role})</span>
                </span>
                <div className="flex gap-2">
                  <Button className="bg-emerald-600 hover:bg-emerald-500" onClick={() => assignRole(u.email, "analyst")}>
                    Analyst
                  </Button>
                  <Button className="bg-violet-600 hover:bg-violet-500" onClick={() => assignRole(u.email, "admin")}>
                    Admin
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h3 className="mb-3 text-lg font-semibold">Module Controls + Config Editor</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(moduleState).map(([name, enabled]) => (
              <Button
                key={name}
                className={enabled ? "bg-emerald-600 hover:bg-emerald-500" : "bg-rose-700 hover:bg-rose-600"}
                onClick={() => toggleModule(name)}
              >
                {name}: {enabled ? "enabled" : "disabled"}
              </Button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {Object.entries(config).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <input readOnly className="w-1/3 rounded border border-slate-700 bg-slate-950 p-2" value={key} />
                <input
                  className="w-2/3 rounded border border-slate-700 bg-slate-950 p-2"
                  value={value}
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
          <svg width={reportValues.length * (barWidth + 12)} height={chartHeight} className="rounded bg-slate-950 p-2">
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
          <Button className="mt-3" onClick={() => setReportValues((prev) => prev.map((v) => Math.max(2, (v + 1) % 10)))}>
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
              {audit.slice().reverse().map((entry, idx) => (
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
