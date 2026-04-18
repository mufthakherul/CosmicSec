import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();

function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  return null;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";
  const successMessage = (location.state as { message?: string })?.message;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [orgSlug, setOrgSlug] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  function validateForm(): boolean {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    setFieldErrors({ email: emailErr ?? undefined, password: passwordErr ?? undefined });
    return !emailErr && !passwordErr;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 20000);
      const response = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          remember_me: rememberMe,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail =
          typeof data?.detail === "string" && data.detail.trim()
            ? data.detail
            : "Invalid email or password";
        throw new Error(detail);
      }

      if (data.requires_2fa) {
        navigate("/auth/2fa", { state: { email, tempToken: data.temp_token } });
        return;
      }

      const token = data.token ?? data.access_token;
      const previewEmail =
        typeof data?.preview_user?.email === "string" ? data.preview_user.email : undefined;
      const user =
        data.user ??
        (previewEmail
          ? {
              id: `preview:${previewEmail}`,
              email: previewEmail,
              full_name: previewEmail.split("@")[0],
              role:
                typeof data?.preview_user?.role === "string" && data.preview_user.role
                  ? data.preview_user.role
                  : "viewer",
            }
          : null);

      if (!token || !user) {
        throw new Error("Invalid authentication response");
      }
      login(token, user);
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Login request timed out. Please try again.");
      } else {
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSsoSignIn() {
    setError(null);
    const slug = orgSlug.trim().toLowerCase();
    if (!slug) {
      setError("Organization slug is required for SSO");
      return;
    }
    setSsoLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/orgs/slug/${encodeURIComponent(slug)}/sso`);
      const redirectUrl = data?.authorization_url ?? data?.authorize_url ?? data?.sso_url;
      if (!redirectUrl || typeof redirectUrl !== "string") {
        setError("SSO is not configured for this organization.");
        return;
      }
      window.location.assign(redirectUrl);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? "Unable to start SSO sign-in.");
      } else {
        setError("Unable to start SSO sign-in.");
      }
    } finally {
      setSsoLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-cyan-500/5">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="h-10 w-10 text-cyan-500" />
          <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
          <p className="text-sm text-slate-400">Sign in to your CosmicSec account</p>
        </div>

        {successMessage && (
          <div
            className="rounded-md border border-emerald-700 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-300"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {error && (
          <div
            className="rounded-md border border-rose-700 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1">
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldErrors((p) => ({ ...p, email: undefined }));
              }}
              className={`w-full rounded-md border bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500 ${fieldErrors.email ? "border-rose-500" : "border-slate-700"}`}
              placeholder="you@example.com"
              aria-label="Email address"
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              autoComplete="email"
              disabled={isLoading}
            />
            {fieldErrors.email && (
              <p id="login-email-error" role="alert" className="text-xs text-rose-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="login-password" className="block text-sm font-medium text-slate-300">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, password: undefined }));
                }}
                className={`w-full rounded-md border bg-slate-950 px-3 py-2 pr-10 text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500 ${fieldErrors.password ? "border-rose-500" : "border-slate-700"}`}
                placeholder="••••••••"
                aria-label="Password"
                aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="login-password-error" role="alert" className="text-xs text-rose-400">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                aria-label="Remember me"
              />
              Remember me
            </label>
            <Link
              to="/auth/forgot"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            className="w-full bg-cyan-600 hover:bg-cyan-500"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="space-y-3 rounded-md border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Single Sign-On
          </p>
          <input
            type="text"
            value={orgSlug}
            onChange={(e) => setOrgSlug(e.target.value)}
            placeholder="Organization slug (e.g. acme-sec)"
            className="input-glow w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500"
            aria-label="Organization slug for SSO"
            disabled={ssoLoading || isLoading}
          />
          <Button
            type="button"
            onClick={() => void handleSsoSignIn()}
            className="w-full bg-slate-700 hover:bg-slate-600"
            disabled={ssoLoading || isLoading}
          >
            {ssoLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to SSO…
              </span>
            ) : (
              "Sign in with SSO"
            )}
          </Button>
        </div>

        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link to="/auth/register" className="text-cyan-400 hover:text-cyan-300 transition">
            Create account
          </Link>
        </p>
      </section>
    </div>
  );
}
