import { Link } from "react-router-dom";
import { Shield, Home, ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 px-4">
      {/* Glowing background blob */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900">
          <Shield className="h-10 w-10 text-cyan-400" />
        </div>

        {/* 404 */}
        <h1 className="mb-2 text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          404
        </h1>

        <h2 className="mb-3 text-2xl font-semibold text-slate-100">Page Not Found</h2>
        <p className="mx-auto mb-8 max-w-sm text-slate-400">
          The route you're looking for doesn't exist or has been moved. Check the URL or go back
          to safety.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-cyan-400"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>

        {/* Help links */}
        <div className="mt-10 flex items-center justify-center gap-6 text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <Link to="/scans" className="hover:text-slate-300 transition-colors">
            Scans
          </Link>
          <Link to="/recon" className="hover:text-slate-300 transition-colors">
            Recon
          </Link>
          <Link to="/auth/login" className="hover:text-slate-300 transition-colors">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
