import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { Button } from "../components/ui/button";

const API = import.meta.env.VITE_API_BASE_URL ?? window.location.origin;

interface FieldErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
}

function validateEmail(email: string): string | null {
    if (!email) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";
    return null;
}

function validatePassword(password: string): string | null {
    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(password)) return "Password must contain at least 1 uppercase letter";
    if (!/\d/.test(password)) return "Password must contain at least 1 number";
    return null;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score, label: "Weak", color: "bg-rose-500" };
    if (score <= 2) return { score, label: "Fair", color: "bg-orange-500" };
    if (score <= 3) return { score, label: "Good", color: "bg-yellow-500" };
    if (score <= 4) return { score, label: "Strong", color: "bg-emerald-500" };
    return { score, label: "Very strong", color: "bg-cyan-500" };
}

export function RegisterPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const strength = getPasswordStrength(password);

    function clearFieldError(field: keyof FieldErrors) {
        setFieldErrors((p) => ({ ...p, [field]: undefined }));
    }

    function validateForm(): boolean {
        const errors: FieldErrors = {};
        if (!name.trim()) errors.name = "Full name is required";
        const emailErr = validateEmail(email);
        if (emailErr) errors.email = emailErr;
        const passwordErr = validatePassword(password);
        if (passwordErr) errors.password = passwordErr;
        if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
        else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";
        if (!acceptedTerms) errors.terms = "You must accept the terms and conditions";
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            await axios.post(`${API}/api/auth/register`, {
                full_name: name.trim(),
                email,
                password,
            });
            navigate("/auth/login", {
                state: { message: "Account created successfully! Please sign in." },
            });
        } catch (err) {
            if (err instanceof AxiosError) {
                setError(err.response?.data?.detail ?? "Registration failed. Please try again.");
            } else {
                setError("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    }

    const inputClass = (hasError?: string) =>
        `w-full rounded-md border bg-slate-950 px-3 py-2 text-slate-100 placeholder-slate-500 outline-none transition focus:ring-2 focus:ring-cyan-500 ${hasError ? "border-rose-500" : "border-slate-700"}`;

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <section className="w-full max-w-md space-y-6 rounded-lg border border-slate-800 bg-slate-900 p-8 shadow-lg shadow-cyan-500/5">
                <div className="flex flex-col items-center gap-2">
                    <UserPlus className="h-10 w-10 text-cyan-500" />
                    <h1 className="text-2xl font-bold text-slate-100">Create an account</h1>
                    <p className="text-sm text-slate-400">Get started with CosmicSec</p>
                </div>

                {error && (
                    <div className="rounded-md border border-rose-700 bg-rose-900/30 px-4 py-3 text-sm text-rose-300" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    {/* Full name */}
                    <div className="space-y-1">
                        <label htmlFor="reg-name" className="block text-sm font-medium text-slate-300">
                            Full name
                        </label>
                        <input
                            id="reg-name"
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                            className={inputClass(fieldErrors.name)}
                            placeholder="Jane Doe"
                            aria-label="Full name"
                            aria-invalid={!!fieldErrors.name}
                            aria-describedby={fieldErrors.name ? "reg-name-error" : undefined}
                            autoComplete="name"
                            disabled={isLoading}
                        />
                        {fieldErrors.name && <p id="reg-name-error" className="text-xs text-rose-400">{fieldErrors.name}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                        <label htmlFor="reg-email" className="block text-sm font-medium text-slate-300">
                            Email
                        </label>
                        <input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                            className={inputClass(fieldErrors.email)}
                            placeholder="you@example.com"
                            aria-label="Email address"
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? "reg-email-error" : undefined}
                            autoComplete="email"
                            disabled={isLoading}
                        />
                        {fieldErrors.email && <p id="reg-email-error" className="text-xs text-rose-400">{fieldErrors.email}</p>}
                    </div>

                    {/* Password */}
                    <div className="space-y-1">
                        <label htmlFor="reg-password" className="block text-sm font-medium text-slate-300">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="reg-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                                className={`${inputClass(fieldErrors.password)} pr-10`}
                                placeholder="••••••••"
                                aria-label="Password"
                                aria-invalid={!!fieldErrors.password}
                                aria-describedby="reg-password-strength reg-password-error"
                                autoComplete="new-password"
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
                        {password.length > 0 && (
                            <div id="reg-password-strength" className="space-y-1">
                                <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : "bg-slate-700"}`}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-slate-400">
                                    Strength: <span className="font-medium text-slate-300">{strength.label}</span>
                                </p>
                            </div>
                        )}
                        {fieldErrors.password && <p id="reg-password-error" className="text-xs text-rose-400">{fieldErrors.password}</p>}
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1">
                        <label htmlFor="reg-confirm" className="block text-sm font-medium text-slate-300">
                            Confirm password
                        </label>
                        <div className="relative">
                            <input
                                id="reg-confirm"
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
                                className={`${inputClass(fieldErrors.confirmPassword)} pr-10`}
                                placeholder="••••••••"
                                aria-label="Confirm password"
                                aria-invalid={!!fieldErrors.confirmPassword}
                                aria-describedby={fieldErrors.confirmPassword ? "reg-confirm-error" : undefined}
                                autoComplete="new-password"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {fieldErrors.confirmPassword && <p id="reg-confirm-error" className="text-xs text-rose-400">{fieldErrors.confirmPassword}</p>}
                    </div>

                    {/* Terms */}
                    <div className="space-y-1">
                        <label className="flex items-start gap-2 text-sm text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => { setAcceptedTerms(e.target.checked); clearFieldError("terms"); }}
                                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-500 focus:ring-cyan-500"
                                aria-label="Accept terms and conditions"
                                disabled={isLoading}
                            />
                            <span>
                                I agree to the{" "}
                                <a href="/terms" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">
                                    Privacy Policy
                                </a>
                            </span>
                        </label>
                        {fieldErrors.terms && <p className="text-xs text-rose-400">{fieldErrors.terms}</p>}
                    </div>

                    <Button className="w-full bg-cyan-600 hover:bg-cyan-500" type="submit" disabled={isLoading}>
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating account…
                            </span>
                        ) : (
                            "Create account"
                        )}
                    </Button>
                </form>

                <p className="text-center text-sm text-slate-400">
                    Already have an account?{" "}
                    <Link to="/auth/login" className="text-cyan-400 hover:text-cyan-300 transition">
                        Sign in
                    </Link>
                </p>
            </section>
        </div>
    );
}
