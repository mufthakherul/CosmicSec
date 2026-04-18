import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Shield, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

type PluginMeta = {
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

type PluginTrust = {
  plugin: string;
  required_permissions: string[];
  signature: {
    verified?: boolean;
    reason?: string;
    source?: string;
  };
  enforce_signatures: boolean;
};

type PluginAudit = {
  timestamp: string;
  action: string;
  plugin: string;
  detail: string;
  status?: string;
};

function Badge({ children, tone }: { children: string; tone: "good" | "bad" | "neutral" | "warn" }) {
  const className =
    tone === "good"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20"
      : tone === "bad"
        ? "bg-rose-500/15 text-rose-300 border-rose-500/20"
        : tone === "warn"
          ? "bg-amber-500/15 text-amber-300 border-amber-500/20"
          : "bg-slate-500/15 text-slate-300 border-slate-500/20";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

export function PluginDetailPage() {
  const { name = "" } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [plugin, setPlugin] = useState<PluginMeta | null>(null);
  const [trust, setTrust] = useState<PluginTrust | null>(null);
  const [audit, setAudit] = useState<PluginAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const headers = useMemo(() => {
    const out: Record<string, string> = { "Content-Type": "application/json" };
    if (token) out.Authorization = `Bearer ${token}`;
    return out;
  }, [token]);

  useEffect(() => {
    if (!name) return;

    const load = async () => {
      setLoading(true);
      try {
        const [pluginRes, trustRes, auditRes, registryRes] = await Promise.all([
          fetch(`${API}/api/plugins/${encodeURIComponent(name)}`, { headers }),
          fetch(`${API}/api/plugins/${encodeURIComponent(name)}/trust`, { headers }),
          fetch(`${API}/api/plugins/audit?limit=100`, { headers }),
          fetch(`${API}/api/plugins`, { headers }),
        ]);

        if (pluginRes.ok) {
          setPlugin((await pluginRes.json()) as PluginMeta);
        } else {
          setPlugin(null);
        }

        if (trustRes.ok) {
          setTrust((await trustRes.json()) as PluginTrust);
        } else {
          setTrust(null);
        }

        if (auditRes.ok) {
          const payload = (await auditRes.json()) as { items?: PluginAudit[] };
          setAudit((payload.items ?? []).filter((entry) => entry.plugin === name));
        } else {
          setAudit([]);
        }

        if (registryRes.ok && !pluginRes.ok) {
          const registry = (await registryRes.json()) as { plugins?: PluginMeta[] };
          const fallback = registry.plugins?.find((entry) => entry.name === name) ?? null;
          if (fallback) setPlugin(fallback);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [name, headers]);

  const refreshPlugin = async () => {
    if (!token) return;
    setActionMessage("Refreshing plugin registry…");
    const response = await fetch(`${API}/api/plugins/reload`, {
      method: "POST",
      headers,
    });
    setActionMessage(response.ok ? "Registry refreshed." : "Registry refresh failed.");
  };

  const togglePlugin = async () => {
    if (!plugin || !token) return;
    const endpoint = plugin.enabled === false ? "enable" : "disable";
    const response = await fetch(`${API}/api/plugins/${encodeURIComponent(plugin.name)}/${endpoint}`, {
      method: "POST",
      headers,
    });
    if (response.ok) {
      setActionMessage(`Plugin ${endpoint}d.`);
      const refreshed = await fetch(`${API}/api/plugins/${encodeURIComponent(plugin.name)}`, { headers });
      if (refreshed.ok) setPlugin((await refreshed.json()) as PluginMeta);
    } else {
      setActionMessage(`Plugin ${endpoint} failed.`);
    }
  };

  const signed = Boolean(trust?.signature?.verified ?? plugin?.signature_verified);
  const enabled = plugin?.enabled !== false;
  const requiredPermissions = trust?.required_permissions ?? plugin?.permissions ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => void navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refreshPlugin()}
              className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20"
            >
              Refresh Registry
            </button>
            <button
              onClick={() => void togglePlugin()}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${enabled ? "bg-rose-700 text-white hover:bg-rose-600" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}
            >
              {enabled ? "Disable" : "Enable"}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-cyan-500/20 bg-linear-to-br from-slate-900 to-slate-950 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
          {loading ? (
            <div className="flex items-center gap-3 py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
              Loading plugin intelligence…
            </div>
          ) : plugin ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-100">{plugin.name}</h1>
                    <Badge tone={signed ? "good" : "bad"}>{signed ? "Signed" : "Unsigned"}</Badge>
                    <Badge tone={enabled ? "good" : "neutral"}>{enabled ? "Enabled" : "Disabled"}</Badge>
                    {trust?.enforce_signatures ? <Badge tone="warn">Signature enforcement on</Badge> : null}
                  </div>
                  <p className="mt-2 max-w-3xl text-sm text-slate-300">{plugin.description}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-400">
                  <div>Version <span className="text-slate-100">{plugin.version}</span></div>
                  <div>Author <span className="text-slate-100">{plugin.author}</span></div>
                  <div>Source <span className="text-slate-100">{trust?.signature?.source ?? "n/a"}</span></div>
                </div>
              </div>

              {actionMessage ? <p className="mt-4 text-xs text-cyan-300">{actionMessage}</p> : null}

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Required permissions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {requiredPermissions.length > 0 ? (
                      requiredPermissions.map((permission) => (
                        <span key={permission} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
                          {permission}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No explicit permissions declared.</span>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Signature trust</p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    {signed ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-rose-400" />}
                    <span>{trust?.signature?.reason ?? plugin.signature_reason ?? "No signature details available."}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {trust?.enforce_signatures
                      ? "Unsigned plugins are blocked by policy."
                      : "Signature enforcement is currently advisory."}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Tags</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(plugin.tags ?? []).length > 0 ? (
                      plugin.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300">
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500">No tags assigned.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Audit events</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{audit.length}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Permissions</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{requiredPermissions.length}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">
                    {user?.role === "admin" ? "Admin" : "Operator"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                  <p className="mt-1 text-lg font-semibold text-slate-100">{enabled ? "Live" : "Paused"}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-sm text-slate-500">Plugin not found.</div>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">Audit Trail</h2>
              <p className="text-sm text-slate-400">Recent registry actions for this plugin.</p>
            </div>
            <Link to="/admin" className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300 hover:border-slate-600 hover:text-slate-100">
              <ExternalLink className="h-4 w-4" />
              Open Admin
            </Link>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Detail</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {audit.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-500">
                      No plugin audit events found.
                    </td>
                  </tr>
                ) : (
                  audit.map((entry, index) => (
                    <tr key={`${entry.timestamp}-${index}`} className="border-t border-slate-800">
                      <td className="p-2 text-slate-400">{entry.timestamp}</td>
                      <td className="p-2 font-medium text-slate-200">{entry.action}</td>
                      <td className="p-2 text-slate-400">{entry.detail}</td>
                      <td className="p-2 text-slate-300">{entry.status ?? "ok"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
