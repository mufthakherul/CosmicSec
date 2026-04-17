import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CheckCircle2, Clock3, RefreshCw, ServerCrash, Shield } from "lucide-react";
import { AppLayout } from "../components/AppLayout";
import {
  KNOWN_SERVICES,
  checkEndpointHealth,
  getApiGatewayBaseUrl,
  getServiceBaseUrl,
  resolveServiceBaseUrl,
} from "../api/runtimeEndpoints";

type ServiceProbe = {
  service: string;
  baseUrl: string;
  healthy: boolean;
  latencyMs: number;
};

type RouteCheck = {
  route: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
};

const GATEWAY_ROUTE_CHECKS = [
  "/health",
  "/api/docs",
  "/api/scans",
  "/api/recon",
  "/api/reports",
  "/api/ai/analyze",
  "/api/bugbounty/programs",
] as const;

async function checkRoute(baseUrl: string, route: string): Promise<RouteCheck> {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
    });
    const latencyMs = Math.round(performance.now() - started);
    const ok = response.ok || response.status === 401 || response.status === 403 || response.status === 405;
    return { route, ok, statusCode: response.status, latencyMs };
  } catch {
    const latencyMs = Math.round(performance.now() - started);
    return { route, ok: false, statusCode: null, latencyMs };
  }
}

export function SystemStatusPage() {
  const [serviceProbes, setServiceProbes] = useState<ServiceProbe[]>([]);
  const [routeChecks, setRouteChecks] = useState<RouteCheck[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const healthyCount = useMemo(
    () => serviceProbes.filter((probe) => probe.healthy).length,
    [serviceProbes],
  );

  const routeHealthyCount = useMemo(
    () => routeChecks.filter((check) => check.ok).length,
    [routeChecks],
  );

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const probes = await Promise.all(
        KNOWN_SERVICES.map(async (service) => {
          const resolved = await resolveServiceBaseUrl(service);
          const fallback = getServiceBaseUrl(service);
          const baseUrl = resolved || fallback;
          const health = await checkEndpointHealth(baseUrl);
          return {
            service,
            baseUrl,
            healthy: health.healthy,
            latencyMs: health.latencyMs,
          } satisfies ServiceProbe;
        }),
      );

      const gatewayBase = getApiGatewayBaseUrl();
      const routes = await Promise.all(GATEWAY_ROUTE_CHECKS.map((route) => checkRoute(gatewayBase, route)));

      setServiceProbes(probes);
      setRouteChecks(routes);
      setUpdatedAt(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
              <Shield className="h-6 w-6 text-cyan-400" />
              System Status
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Live health, endpoint probe timing, and API gateway route coverage.
            </p>
            {updatedAt && (
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Updated at {updatedAt.toLocaleTimeString()}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/settings"
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
            >
              Back to Settings
            </Link>
            <button
              onClick={() => void refreshStatus()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Services Healthy</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {healthyCount}/{KNOWN_SERVICES.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Gateway Routes OK</p>
            <p className="mt-1 text-2xl font-semibold text-slate-100">
              {routeHealthyCount}/{routeChecks.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Gateway Base URL</p>
            <p className="mt-1 break-all font-mono text-xs text-cyan-300">{getApiGatewayBaseUrl()}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Service Health Probes
            </h2>
            <div className="space-y-2">
              {serviceProbes.map((probe) => (
                <div
                  key={probe.service}
                  className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm text-slate-200">
                      {probe.healthy ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <ServerCrash className="h-4 w-4 text-rose-400" />
                      )}
                      {probe.service}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        probe.healthy
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {probe.healthy ? "Healthy" : "Unreachable"}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs text-slate-400">{probe.baseUrl}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Latency: {probe.latencyMs} ms</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              <Activity className="h-4 w-4 text-cyan-400" />
              Gateway Route Checks
            </h2>
            <div className="space-y-2">
              {routeChecks.map((route) => (
                <div key={route.route} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-xs text-slate-300">{route.route}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        route.ok ? "bg-cyan-500/20 text-cyan-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {route.ok ? "Reachable" : "Failed"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Status: {route.statusCode ?? "network error"} · Latency: {route.latencyMs} ms
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
