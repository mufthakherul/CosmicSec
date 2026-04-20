type KnownService =
  | "api-gateway"
  | "auth-service"
  | "scan-service"
  | "ai-service"
  | "recon-service"
  | "report-service"
  | "agent-relay"
  | "bugbounty-service"
  | "collab-service"
  | "integration-service"
  | "notification-service"
  | "phase5-service"
  | "org-service"
  | "compliance-service"
  | "egress-service";

export const KNOWN_SERVICES: readonly KnownService[] = [
  "api-gateway",
  "auth-service",
  "scan-service",
  "ai-service",
  "recon-service",
  "report-service",
  "agent-relay",
  "bugbounty-service",
  "collab-service",
  "integration-service",
  "notification-service",
  "phase5-service",
  "org-service",
  "compliance-service",
  "egress-service",
];

const SERVICE_PORTS: Record<KnownService, number> = {
  "api-gateway": 8000,
  "auth-service": 8001,
  "scan-service": 8002,
  "ai-service": 8003,
  "recon-service": 8004,
  "report-service": 8005,
  "collab-service": 8006,
  "agent-relay": 8011,
  "bugbounty-service": 8009,
  "integration-service": 8008,
  "notification-service": 8012,
  "phase5-service": 8010,
  "org-service": 8014,
  "compliance-service": 8013,
  "egress-service": 8016,
};

const DEV_FRONTEND_PORTS = new Set(["3000", "4173", "5173", "4200"]);
const resolved = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

export interface EndpointProbeResult {
  url: string;
  healthy: boolean;
}

export interface EndpointDiagnosticsSnapshot {
  service: KnownService;
  selected: string;
  envOverride?: string;
  candidates: string[];
  probes: EndpointProbeResult[];
}

function normalize(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function isLocalHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function formatHostForUrl(hostname: string): string {
  if (hostname.includes(":")) {
    return `[${hostname}]`;
  }
  return hostname;
}

function buildUrl(protocol: string, hostname: string, port?: number): string {
  const host = formatHostForUrl(hostname);
  if (port === undefined) {
    return `${protocol}//${host}`;
  }
  return `${protocol}//${host}:${port}`;
}

function replaceTunnelPortLabel(hostname: string, targetPort: number): string | null {
  const labels = hostname.split(".");
  if (labels.length === 0) return null;

  const first = labels[0];
  const replaced = first.replace(/-\d{2,5}(?=$|-)/, `-${targetPort}`);
  if (replaced === first) {
    return null;
  }

  labels[0] = replaced;
  return labels.join(".");
}

function unique(list: string[]): string[] {
  return [...new Set(list.filter(Boolean).map(normalize))];
}

function explicitEnvFor(service: string): string | undefined {
  if (service === "api-gateway") {
    return import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_GATEWAY_BASE_URL;
  }

  const envKey = `VITE_${service.toUpperCase().replace(/-/g, "_")}_BASE_URL`;
  return import.meta.env[envKey as keyof ImportMetaEnv] as string | undefined;
}

function inferCandidates(targetPort: number): string[] {
  if (typeof window === "undefined") {
    return [`http://localhost:${targetPort}`];
  }

  const { protocol, hostname, port, origin } = window.location;
  const candidates: string[] = [];

  const tunnelHost = replaceTunnelPortLabel(hostname, targetPort);
  if (tunnelHost) {
    candidates.push(buildUrl(protocol, tunnelHost));
  }

  if (isLocalHost(hostname)) {
    candidates.push(`http://127.0.0.1:${targetPort}`);
    candidates.push(buildUrl(protocol, hostname, targetPort));
    candidates.push(`http://localhost:${targetPort}`);
  }

  if (port) {
    if (port !== String(targetPort)) {
      candidates.push(buildUrl(protocol, hostname, targetPort));
    } else {
      candidates.push(origin);
    }

    if (DEV_FRONTEND_PORTS.has(port) && !isLocalHost(hostname)) {
      candidates.push(buildUrl(protocol, hostname, targetPort));
    }
  } else {
    candidates.push(origin);
    candidates.push(buildUrl(protocol, hostname, targetPort));
  }

  if (!isLocalHost(hostname)) {
    candidates.push(`http://localhost:${targetPort}`);
  }

  return unique(candidates);
}

function candidatesForService(service: string): string[] {
  const explicit = explicitEnvFor(service);
  const port = SERVICE_PORTS[service as KnownService] ?? 8000;
  const inferred = inferCandidates(port);

  if (explicit) {
    return unique([explicit, ...inferred]);
  }

  return inferred;
}

async function probeHealth(baseUrl: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch(`${normalize(baseUrl)}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
      credentials: "omit",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkEndpointHealth(
  baseUrl: string,
): Promise<{ healthy: boolean; latencyMs: number }> {
  const started = typeof performance !== "undefined" ? performance.now() : Date.now();
  const healthy = await probeHealth(baseUrl);
  const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    healthy,
    latencyMs: Math.round(ended - started),
  };
}

export async function resolveServiceBaseUrl(
  service: KnownService = "api-gateway",
): Promise<string> {
  const cached = resolved.get(service);
  if (cached) {
    return cached;
  }

  const running = pending.get(service);
  if (running) {
    return running;
  }

  const resolver = (async () => {
    const candidates = candidatesForService(service);

    for (const candidate of candidates) {
      if (await probeHealth(candidate)) {
        const normalized = normalize(candidate);
        resolved.set(service, normalized);
        return normalized;
      }
    }

    const fallback = normalize(candidates[0] || "");
    if (fallback) {
      resolved.set(service, fallback);
    }
    return fallback;
  })();

  pending.set(service, resolver);
  try {
    return await resolver;
  } finally {
    pending.delete(service);
  }
}

export function getServiceBaseUrl(service: KnownService = "api-gateway"): string {
  return resolved.get(service) || normalize(candidatesForService(service)[0] || "");
}

export function getApiGatewayBaseUrl(): string {
  return getServiceBaseUrl("api-gateway");
}

export async function ensureApiGatewayBaseUrl(): Promise<string> {
  return resolveServiceBaseUrl("api-gateway");
}

export function getApiGatewayWebSocketUrl(path: string): string {
  const base = getApiGatewayBaseUrl();
  const wsBase = base.replace(/^https?:/, (scheme) => (scheme === "https:" ? "wss:" : "ws:"));
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${wsBase}${normalizedPath}`;
}

export function warmupApiEndpointResolution(): void {
  void ensureApiGatewayBaseUrl();
}

export async function getEndpointDiagnosticsSnapshot(
  service: KnownService = "api-gateway",
): Promise<EndpointDiagnosticsSnapshot> {
  const envOverride = explicitEnvFor(service);
  const candidates = candidatesForService(service);
  const selected = await resolveServiceBaseUrl(service);
  const probeCandidates = candidates.slice(0, 4);
  const probes = await Promise.all(
    probeCandidates.map(async (url) => ({
      url,
      healthy: await probeHealth(url),
    })),
  );

  return {
    service,
    selected,
    envOverride,
    candidates,
    probes,
  };
}
