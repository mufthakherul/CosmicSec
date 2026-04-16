import { useState } from "react";
import { Download, X } from "lucide-react";
import { usePWA } from "../hooks/usePWA";

export function PWAInstallBanner() {
  const { canInstall, promptInstall } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-emerald-500/10 backdrop-blur-sm"
    >
      <Download className="h-4 w-4 shrink-0 text-emerald-400" />
      <p className="text-sm text-slate-200">Install CosmicSec as an app for faster access and offline support.</p>
      <button
        onClick={() => {
          void promptInstall();
        }}
        className="ml-2 rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-900 transition-colors hover:bg-emerald-400"
      >
        Install
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss install banner"
        className="ml-1 rounded-md p-1 text-slate-400 transition-colors hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
