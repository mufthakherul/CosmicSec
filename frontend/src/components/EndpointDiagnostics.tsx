import { useEffect, useState } from "react";
import {
  getEndpointDiagnosticsSnapshot,
  type EndpointDiagnosticsSnapshot,
} from "../api/runtimeEndpoints";

export function EndpointDiagnostics() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<EndpointDiagnosticsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEndpointDiagnosticsSnapshot("api-gateway");
      setSnapshot(data);
    } catch {
      setError("Unable to load endpoint diagnostics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 w-85 max-w-[calc(100vw-1.5rem)]">
      {open ? (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/95 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
              Endpoint Diagnostics
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              aria-label="Close endpoint diagnostics"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 p-3 text-xs">
            {loading ? (
              <p className="text-slate-400">Checking endpoint health…</p>
            ) : error ? (
              <p className="text-rose-400">{error}</p>
            ) : snapshot ? (
              <>
                <div>
                  <p className="text-slate-500">Selected</p>
                  <p className="font-mono text-cyan-300 break-all">{snapshot.selected}</p>
                </div>
                {snapshot.envOverride && (
                  <div>
                    <p className="text-slate-500">Env Override</p>
                    <p className="font-mono text-amber-300 break-all">{snapshot.envOverride}</p>
                  </div>
                )}
                <div>
                  <p className="mb-1 text-slate-500">Probe Results</p>
                  <ul className="space-y-1">
                    {snapshot.probes.map((probe) => (
                      <li
                        key={probe.url}
                        className="rounded border border-slate-800 bg-slate-900/70 px-2 py-1"
                      >
                        <p className="font-mono text-slate-300 break-all">{probe.url}</p>
                        <p className={probe.healthy ? "text-emerald-400" : "text-rose-400"}>
                          {probe.healthy ? "Healthy" : "Unreachable"}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => void refresh()}
                  className="w-full rounded bg-cyan-500/20 px-2 py-1.5 text-cyan-300 transition-colors hover:bg-cyan-500/30"
                >
                  Re-check
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-cyan-200 shadow-lg transition-colors hover:bg-cyan-500/30"
        >
          Endpoint Debug
        </button>
      )}
    </div>
  );
}
