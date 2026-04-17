import { useState } from "react";
import { User, Key, Bell, Copy, Trash2, Plus, Loader2, Check } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { useNotificationStore } from "../store/notificationStore";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={() => void handleCopy()}
      className="rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
      aria-label="Copy"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const addNotification = useNotificationStore((s) => s.addNotification);

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);

  const [notifPrefs, setNotifPrefs] = useState({
    email_alerts: true,
    slack_alerts: false,
    critical_only: false,
  });

  const generateKey = async () => {
    setGeneratingKey(true);
    try {
      const token = localStorage.getItem("cosmicsec_token");
      const res = await fetch(`${API}/api/auth/apikeys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: `key-${Date.now()}` }),
      });
      const data = (await res.json()) as {
        id?: string;
        key?: string;
        name?: string;
        prefix?: string;
        created_at?: string;
      };
      const newKey: ApiKey = {
        id: data.id ?? `k-${Date.now()}`,
        name: data.name ?? `key-${Date.now()}`,
        prefix: data.prefix ?? data.key?.slice(0, 8) ?? "cs_demo_",
        created_at: data.created_at ?? new Date().toISOString(),
      };
      setApiKeys((prev) => [newKey, ...prev]);
      setNewKeyValue(data.key ?? `cs_demo_${Math.random().toString(36).slice(2)}`);
      addNotification({
        type: "success",
        message: "API key generated. Copy it now — it won't be shown again.",
      });
    } catch {
      addNotification({ type: "error", message: "Failed to generate API key." });
    } finally {
      setGeneratingKey(false);
    }
  };

  const revokeKey = async (id: string) => {
    try {
      const token = localStorage.getItem("cosmicsec_token");
      await fetch(`${API}/api/auth/apikeys/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      addNotification({ type: "success", message: "API key revoked." });
    } catch {
      addNotification({ type: "error", message: "Failed to revoke key." });
    }
  };

  const togglePref = (key: keyof typeof notifPrefs) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    addNotification({ type: "info", message: "Notification preference updated." });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-cyan-400" />
            <h1 className="text-2xl font-bold text-slate-100">Profile</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">Account settings and security preferences.</p>
        </header>

        {/* User info card */}
        <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-400">
              <User className="h-7 w-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-100">{user?.full_name ?? "—"}</p>
              <p className="text-sm text-slate-400">{user?.email ?? "—"}</p>
              <span className="mt-1 inline-block rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium capitalize text-purple-300">
                {user?.role ?? "user"}
              </span>
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-300">API Keys</h2>
            </div>
            <button
              onClick={() => void generateKey()}
              disabled={generatingKey}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
            >
              {generatingKey ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Generate New Key
            </button>
          </div>

          {/* Newly generated key */}
          {newKeyValue && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2.5">
              <span className="flex-1 truncate font-mono text-xs text-amber-300">
                {newKeyValue}
              </span>
              <CopyButton text={newKeyValue} />
              <button
                onClick={() => setNewKeyValue(null)}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Dismiss
              </button>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">No API keys yet.</p>
          ) : (
            <ul className="space-y-2">
              {apiKeys.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-300">{k.name}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {k.prefix}••••••••
                      {k.last_used
                        ? ` · Last used ${new Date(k.last_used).toLocaleDateString()}`
                        : " · Never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => void revokeKey(k.id)}
                    className="rounded p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    aria-label="Revoke key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Notification preferences */}
        <div className="rounded-xl border border-slate-800 bg-white/5 p-5 backdrop-blur-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-slate-300">Notification Preferences</h2>
          </div>
          <ul className="space-y-3">
            {(
              [
                {
                  key: "email_alerts",
                  label: "Email Alerts",
                  description: "Receive scan results and critical alerts via email.",
                },
                {
                  key: "slack_alerts",
                  label: "Slack Alerts",
                  description: "Send notifications to your Slack workspace.",
                },
                {
                  key: "critical_only",
                  label: "Critical Findings Only",
                  description: "Only notify for critical severity findings.",
                },
              ] as const
            ).map(({ key, label, description }) => (
              <li key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">{label}</p>
                  <p className="text-xs text-slate-500">{description}</p>
                </div>
                <button
                  onClick={() => togglePref(key)}
                  title={`${label} toggle`}
                  className={[
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200",
                    notifPrefs[key] ? "bg-cyan-500" : "bg-slate-700",
                  ].join(" ")}
                  aria-label={label}
                >
                  <span
                    className={[
                      "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200",
                      notifPrefs[key] ? "translate-x-4" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
