/**
 * Service Worker Update Banner — Phase U.1
 * Shows a non-intrusive banner when a new app version is available.
 */
import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function SWUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("cosmicsec:sw-update-available", handler);
    return () => window.removeEventListener("cosmicsec:sw-update-available", handler);
  }, []);

  if (!visible) return null;

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-cyan-500/10 backdrop-blur-sm"
    >
      <RefreshCw className="h-4 w-4 shrink-0 text-cyan-400" />
      <p className="text-sm text-slate-200">
        A new version of CosmicSec is available.
      </p>
      <button
        onClick={handleReload}
        className="ml-2 rounded-md bg-cyan-500 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-cyan-400 transition-colors"
      >
        Reload
      </button>
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss update banner"
        className="ml-1 rounded-md p-1 text-slate-400 hover:text-slate-200 transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
