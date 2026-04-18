import {
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
const CODE_LENGTH = 6;
const COUNTDOWN_SECONDS = 30;

export function TwoFactorPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, tempToken } = (location.state as { email?: string; tempToken?: string }) ?? {};

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if no temp token
  useEffect(() => {
    if (!tempToken) navigate("/auth/login", { replace: true });
  }, [tempToken, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const setDigit = useCallback((index: number, value: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  function handleDigitChange(index: number, value: string) {
    if (!/^\d?$/.test(value)) return;
    setError(null);
    setCodeError(null);
    setDigit(index, value);
    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      setDigit(index - 1, "");
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    setError(null);
    setCodeError(null);
    const newDigits = Array(CODE_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCodeError(null);

    const code = useBackup ? backupCode.trim() : digits.join("");

    if (!useBackup && code.length !== CODE_LENGTH) {
      setCodeError("Please enter all 6 digits");
      return;
    }
    if (useBackup && !code) {
      setCodeError("Please enter your backup code");
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.auth.verify2FA({
        email: email ?? "",
        code,
        temp_token: tempToken,
        is_backup: useBackup,
      });
      const token = data.token ?? data.access_token;
      if (!token || !data.user) {
        throw new Error("Invalid two-factor response");
      }
      login(token, data.user, {
        refreshToken: typeof data?.refresh_token === "string" ? data.refresh_token : undefined,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof AxiosError) {
        setError(err.response?.data?.detail ?? "Invalid verification code");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    if (countdown > 0) return;
    setError(null);
    try {
      await api.auth.resend2FA({ email: email ?? "", temp_token: tempToken });
      setCountdown(COUNTDOWN_SECONDS);
      setDigits(Array(CODE_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  }

  if (!tempToken) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-cyan-500/5">
        <div className="flex flex-col items-center gap-2">
          <ShieldCheck className="h-10 w-10 text-cyan-500" />
          <h1 className="text-2xl font-bold text-slate-100">Two-factor verification</h1>
          <p className="text-center text-sm text-slate-400">
            {useBackup
              ? "Enter one of your backup codes"
              : "Enter the 6-digit code from your authenticator app"}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {useBackup ? (
            <div className="space-y-1">
              <label htmlFor="backup-code" className="block text-sm font-medium text-slate-300">
                Backup code
              </label>
              <input
                id="backup-code"
                type="text"
                value={backupCode}
                onChange={(e) => {
                  setBackupCode(e.target.value);
                  setError(null);
                  setCodeError(null);
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500"
                placeholder="xxxx-xxxx-xxxx"
                aria-label="Backup code"
                aria-describedby={codeError ? "twofa-code-error" : undefined}
                autoComplete="one-time-code"
                disabled={isLoading}
              />
              {codeError && (
                <p id="twofa-code-error" className="text-xs text-rose-400">
                  {codeError}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-center text-sm font-medium text-slate-300">
                Verification code
              </label>
              <div className="flex justify-center gap-2">
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={i === 0 ? handlePaste : undefined}
                    className="h-12 w-12 rounded-md border border-slate-700 bg-slate-950 text-center font-mono text-xl text-slate-100 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500"
                    aria-label={`Digit ${i + 1} of ${CODE_LENGTH}`}
                    aria-describedby={codeError ? "twofa-code-error" : undefined}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    disabled={isLoading}
                  />
                ))}
              </div>
              {codeError && (
                <p id="twofa-code-error" className="text-center text-xs text-rose-400">
                  {codeError}
                </p>
              )}
            </div>
          )}

          <Button
            className="w-full bg-cyan-600 hover:bg-cyan-500"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying…
              </span>
            ) : (
              "Verify"
            )}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-3 text-sm">
          {!useBackup && (
            <p className="text-slate-400">
              {countdown > 0 ? (
                <>
                  Code expires in <span className="font-medium text-slate-200">{countdown}s</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-cyan-400 hover:text-cyan-300 transition"
                >
                  Resend code
                </button>
              )}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setUseBackup((v) => !v);
              setError(null);
              setCodeError(null);
            }}
            className="text-cyan-400 hover:text-cyan-300 transition"
          >
            {useBackup ? "Use authenticator code instead" : "Use a backup code"}
          </button>

          <Link to="/auth/login" className="text-slate-400 hover:text-slate-300 transition">
            Cancel and return to sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
