import { useState } from "react";
import {
  Bell,
  Globe,
  Lock,
  Moon,
  Save,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotificationStore } from "../store/notificationStore";

type ApiError = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 border-b border-slate-800 pb-4">
        <h3 className="text-base font-semibold text-slate-100">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-cyan-500" : "bg-slate-700",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const addNotification = useNotificationStore((s) => s.addNotification);

  // Notification preferences
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSlack, setNotifSlack] = useState(false);
  const [notifCriticalOnly, setNotifCriticalOnly] = useState(false);

  // Security preferences
  const [sessionTimeout, setSessionTimeout] = useState("3600");
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);

  // Scan defaults
  const [defaultScanTimeout, setDefaultScanTimeout] = useState("300");
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  // Delete account confirmation
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [toggling2fa, setToggling2fa] = useState(false);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (
      typeof error === "object" &&
      error !== null &&
      "response" in error &&
      typeof (error as ApiError).response?.data?.detail === "string"
    ) {
      return (error as ApiError).response?.data?.detail ?? fallback;
    }
    return fallback;
  };

  const handleSaveGeneral = async () => {
    setSavingDefaults(true);
    try {
      const parsedTimeout = Number.parseInt(defaultScanTimeout, 10);
      await client.post("/api/settings/scan-defaults", {
        scan_timeout_seconds: Number.isFinite(parsedTimeout) ? parsedTimeout : 300,
        auto_analyze: autoAnalyze,
      });
      addNotification({ type: "success", message: "Scan defaults saved." });
    } catch (error) {
      addNotification({
        type: "error",
        message: getErrorMessage(error, "Failed to save scan defaults."),
      });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSavingSecurity(true);
    try {
      addNotification({
        type: "success",
        message: `Session timeout set to ${sessionTimeout === "0" ? "never" : `${sessionTimeout}s`}.`,
      });
    } finally {
      setSavingSecurity(false);
    }
  };

  const handleToggleTwoFactor = async (enabled: boolean) => {
    setToggling2fa(true);
    try {
      if (enabled) {
        await client.post("/api/auth/2fa/enable");
        addNotification({ type: "success", message: "Two-factor authentication enabled." });
      } else {
        await client.delete("/api/auth/2fa/disable");
        addNotification({ type: "warning", message: "Two-factor authentication disabled." });
      }
      setRequireTwoFactor(enabled);
    } catch (error) {
      addNotification({
        type: "error",
        message: getErrorMessage(error, "Failed to update two-factor settings."),
      });
    } finally {
      setToggling2fa(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== user?.email) {
      addNotification({ type: "error", message: "Email confirmation does not match." });
      return;
    }
    setDeletingAccount(true);
    try {
      await client.delete("/api/auth/account");
      addNotification({ type: "warning", message: "Account deleted successfully." });
      setDeleteConfirm("");
      logout();
    } catch (error) {
      addNotification({
        type: "error",
        message: getErrorMessage(error, "Failed to delete account."),
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setRevokingSessions(true);
    try {
      await client.post("/api/auth/sessions/revoke-all");
      addNotification({ type: "warning", message: "All sessions revoked." });
      logout();
    } catch (error) {
      addNotification({
        type: "error",
        message: getErrorMessage(error, "Failed to revoke sessions."),
      });
    } finally {
      setRevokingSessions(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Manage your account preferences and platform configuration
          </p>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Appearance */}
        {/* ------------------------------------------------------------------ */}
        <Section
          title="Appearance"
          description="Customise the look and feel of CosmicSec"
        >
          <div>
            <p className="mb-2 text-sm font-medium text-slate-200">Theme</p>
            <div className="flex gap-3">
              {(["dark", "light"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={[
                    "flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-colors",
                    theme === t
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                      : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600",
                  ].join(" ")}
                >
                  {t === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* Notifications */}
        {/* ------------------------------------------------------------------ */}
        <Section
          title="Notifications"
          description="Choose how and when you receive alerts"
        >
          <ToggleRow
            label="Email notifications"
            description="Receive scan completion and finding alerts by email"
            checked={notifEmail}
            onChange={setNotifEmail}
          />
          <ToggleRow
            label="Slack notifications"
            description="Post alerts to your connected Slack workspace"
            checked={notifSlack}
            onChange={setNotifSlack}
          />
          <ToggleRow
            label="Critical findings only"
            description="Only notify for critical and high severity findings"
            checked={notifCriticalOnly}
            onChange={setNotifCriticalOnly}
          />
          <button
            onClick={() => addNotification({ type: "success", message: "Notification preferences saved." })}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
          >
            <Save className="h-4 w-4" />
            Save preferences
          </button>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* Scan defaults */}
        {/* ------------------------------------------------------------------ */}
        <Section
          title="Scan Defaults"
          description="Default settings applied to every new scan"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="scanTimeout">
                Scan timeout (seconds)
              </label>
              <input
                id="scanTimeout"
                type="number"
                value={defaultScanTimeout}
                onChange={(e) => setDefaultScanTimeout(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>
          <ToggleRow
            label="Auto-analyze findings with AI"
            description="Automatically run AI correlation after each scan completes"
            checked={autoAnalyze}
            onChange={setAutoAnalyze}
          />
          <button
            onClick={handleSaveGeneral}
            disabled={savingDefaults}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
          >
            <Save className="h-4 w-4" />
            {savingDefaults ? "Saving..." : "Save defaults"}
          </button>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* Security */}
        {/* ------------------------------------------------------------------ */}
        <Section
          title="Security"
          description="Account security and session settings"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300" htmlFor="sessionTimeout">
                Session timeout (seconds)
              </label>
              <select
                id="sessionTimeout"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
              >
                <option value="900">15 minutes</option>
                <option value="1800">30 minutes</option>
                <option value="3600">1 hour</option>
                <option value="86400">24 hours</option>
                <option value="0">Never</option>
              </select>
            </div>
          </div>
          <ToggleRow
            label="Require Two-Factor Authentication"
            description="Adds TOTP verification on every login"
            checked={requireTwoFactor}
            onChange={handleToggleTwoFactor}
          />
          <button
            onClick={handleSaveSecurity}
            disabled={savingSecurity || toggling2fa}
            className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-600"
          >
            <Shield className="h-4 w-4" />
            {savingSecurity ? "Saving..." : toggling2fa ? "Updating 2FA..." : "Save security settings"}
          </button>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* Account info */}
        {/* ------------------------------------------------------------------ */}
        <Section title="Account Information">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {[
              { label: "Email", value: user?.email ?? "—", icon: Globe },
              { label: "Name", value: user?.full_name ?? "—", icon: User },
              { label: "Role", value: user?.role ?? "—", icon: Lock },
              { label: "User ID", value: user?.id ?? "—", icon: Shield },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-2 rounded-lg bg-slate-950 px-3 py-2">
                <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="truncate font-medium text-slate-200">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ------------------------------------------------------------------ */}
        {/* Danger zone */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="mb-4 border-b border-rose-500/20 pb-4">
            <h3 className="flex items-center gap-2 text-base font-semibold text-rose-400">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </h3>
            <p className="mt-0.5 text-sm text-slate-400">
              These actions are permanent and cannot be undone.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-300">
                Delete account
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Type your email address <strong className="text-slate-300">{user?.email}</strong> to
                confirm deletion. All data will be permanently removed.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Confirm your email"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="flex-1 rounded-lg border border-rose-500/30 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 placeholder-slate-600"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== user?.email || deletingAccount}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingAccount ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-slate-900 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-200">Sign out everywhere</p>
                <p className="text-xs text-slate-500">Revoke all active sessions</p>
              </div>
              <button
                onClick={handleRevokeAllSessions}
                disabled={revokingSessions}
                className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
              >
                {revokingSessions ? "Revoking..." : "Sign out all"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
