import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import { Button } from "../components/ui/button";
import { getApiGatewayBaseUrl } from "../api/runtimeEndpoints";

const API = getApiGatewayBaseUrl();
const RESEND_COOLDOWN = 60;

function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
  return null;
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const sendResetLink = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await axios.post(`${API}/api/auth/forgot-password`, { email });
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? "Failed to send reset link. Please try again.");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const emailErr = validateEmail(email);
    setEmailError(emailErr);
    if (emailErr) return;
    await sendResetLink();
  }

  async function handleResend() {
    if (cooldown > 0) return;
    await sendResetLink();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-cyan-500/5">
        {sent ? (
          /* ── Success state ── */
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400">
              <Mail className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Check your email</h1>
            <p className="text-sm text-slate-400">
              We sent a password reset link to{" "}
              <span className="font-medium text-slate-200">{email}</span>. Please check your inbox
              and spam folder.
            </p>

            {error && (
              <div
                className="w-full rounded-md border border-rose-700 bg-rose-900/30 px-4 py-3 text-sm text-rose-300"
                role="alert"
              >
                {error}
              </div>
            )}

            <Button
              className="w-full bg-cyan-600 hover:bg-cyan-500"
              onClick={handleResend}
              disabled={cooldown > 0 || isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </span>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend reset link"
              )}
            </Button>

            <Link
              to="/auth/login"
              className="flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="flex flex-col items-center gap-2">
              <Mail className="h-10 w-10 text-cyan-500" />
              <h1 className="text-2xl font-bold text-slate-100">Forgot password?</h1>
              <p className="text-center text-sm text-slate-400">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>
            </div>

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
                <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                  }}
                  className={`w-full rounded-md border bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500 ${emailError ? "border-rose-500" : "border-slate-700"}`}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  aria-describedby={emailError ? "forgot-email-error" : undefined}
                  autoComplete="email"
                  disabled={isLoading}
                />
                {emailError && (
                  <p id="forgot-email-error" className="text-xs text-rose-400">
                    {emailError}
                  </p>
                )}
              </div>

              <Button
                className="w-full bg-cyan-600 hover:bg-cyan-500"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <p className="text-center">
              <Link
                to="/auth/login"
                className="flex items-center justify-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
