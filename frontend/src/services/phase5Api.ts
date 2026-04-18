import client from "../api/client";

export interface RiskPostureResponse {
  overall_security_score: number;
  trend: string;
  heatmap_ready: boolean;
  industry_benchmark_percentile: number;
}

export interface SocDashboardResponse {
  total_alerts: number;
  critical_alerts: number;
  average_priority: number;
}

export interface SocMetricsResponse {
  mttd_minutes: number;
  mttr_minutes: number;
  alert_fatigue_index: number;
}

export interface AlertFeedItem {
  id: string;
  source: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  status: "open" | "investigating" | "resolved";
  created_at: string;
}

export interface IncidentTimelineItem {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "investigating" | "resolved";
  timestamp: string;
}

export interface CIGateStatusItem {
  id: string;
  pipeline: string;
  branch: string;
  status: "pass" | "fail" | "running";
  runtime_seconds: number;
  updated_at: string;
}

export interface BugBountyEarningsResponse {
  total_submissions: number;
  paid_submissions: number;
  total_paid: number;
  monthly_earnings?: Array<{ month: string; amount: number }>;
}

const PREVIEW_MONTHLY_EARNINGS = [
  { month: "Jan", amount: 2400 },
  { month: "Feb", amount: 3900 },
  { month: "Mar", amount: 4600 },
  { month: "Apr", amount: 5200 },
  { month: "May", amount: 6100 },
  { month: "Jun", amount: 5700 },
];

function isPreviewSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = window.localStorage.getItem("cosmicsec_token") ?? "";
  return token.startsWith("demo-preview");
}

function preview<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

export async function fetchPhase5RiskPosture(): Promise<RiskPostureResponse> {
  if (isPreviewSession()) {
    return preview({
      overall_security_score: 82,
      trend: "up",
      heatmap_ready: true,
      industry_benchmark_percentile: 76,
    });
  }
  const { data } = await client.get<RiskPostureResponse>("/api/phase5/executive/risk-posture");
  return data;
}

export async function fetchPhase5SocDashboard(): Promise<SocDashboardResponse> {
  if (isPreviewSession()) {
    return preview({ total_alerts: 24, critical_alerts: 3, average_priority: 41 });
  }
  const { data } = await client.get<SocDashboardResponse>("/api/phase5/soc/alerts/dashboard");
  return data;
}

export async function fetchPhase5SocMetrics(): Promise<SocMetricsResponse> {
  if (isPreviewSession()) {
    return preview({ mttd_minutes: 14, mttr_minutes: 42, alert_fatigue_index: 31 });
  }
  const { data } = await client.get<SocMetricsResponse>("/api/phase5/soc/metrics");
  return data;
}

export async function fetchPhase5Alerts(): Promise<AlertFeedItem[]> {
  if (isPreviewSession()) {
    return preview<AlertFeedItem[]>([
      {
        id: "alt-preview-1",
        source: "SIEM",
        severity: "critical",
        title: "Multiple privilege escalation attempts detected",
        status: "open",
        created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      },
    ]);
  }
  const { data } = await client.get<{ items: AlertFeedItem[] }>("/api/phase5/soc/alerts");
  return data.items;
}

export async function fetchPhase5Incidents(): Promise<IncidentTimelineItem[]> {
  if (isPreviewSession()) {
    return preview<IncidentTimelineItem[]>([
      {
        id: "inc-preview-1",
        title: "Credential stuffing campaign",
        severity: "high",
        status: "investigating",
        timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }
  const { data } = await client.get<{ items: IncidentTimelineItem[] }>("/api/phase5/soc/incidents");
  return data.items;
}

export async function fetchPhase5CIGateStatus(): Promise<CIGateStatusItem[]> {
  if (isPreviewSession()) {
    return preview<CIGateStatusItem[]>([
      {
        id: "ci-preview-1",
        pipeline: "frontend-security-checks",
        branch: "main",
        status: "pass",
        runtime_seconds: 271,
        updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      },
    ]);
  }
  const { data } = await client.get<{ items: CIGateStatusItem[] }>(
    "/api/phase5/devsecops/cicd/status",
  );
  return data.items;
}

export async function fetchBugBountyEarnings(): Promise<BugBountyEarningsResponse> {
  if (isPreviewSession()) {
    return preview<BugBountyEarningsResponse>({
      total_submissions: 18,
      paid_submissions: 7,
      total_paid: 26100,
      monthly_earnings: PREVIEW_MONTHLY_EARNINGS,
    });
  }
  const { data } = await client.get<BugBountyEarningsResponse>("/api/bugbounty/dashboard/earnings");
  return data;
}
