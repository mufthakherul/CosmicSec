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

export async function fetchPhase5RiskPosture() {
  const { data } = await client.get<RiskPostureResponse>("/api/phase5/executive/risk-posture");
  return data;
}

export async function fetchPhase5SocDashboard() {
  const { data } = await client.get<SocDashboardResponse>("/api/phase5/soc/alerts/dashboard");
  return data;
}

export async function fetchPhase5SocMetrics() {
  const { data } = await client.get<SocMetricsResponse>("/api/phase5/soc/metrics");
  return data;
}

export async function fetchPhase5Alerts() {
  const { data } = await client.get<{ items: AlertFeedItem[] }>("/api/phase5/soc/alerts");
  return data.items;
}

export async function fetchPhase5Incidents() {
  const { data } = await client.get<{ items: IncidentTimelineItem[] }>("/api/phase5/soc/incidents");
  return data.items;
}

export async function fetchPhase5CIGateStatus() {
  const { data } = await client.get<{ items: CIGateStatusItem[] }>(
    "/api/phase5/devsecops/cicd/status",
  );
  return data.items;
}

export async function fetchBugBountyEarnings() {
  const { data } = await client.get<BugBountyEarningsResponse>("/api/bugbounty/dashboard/earnings");
  return data;
}
