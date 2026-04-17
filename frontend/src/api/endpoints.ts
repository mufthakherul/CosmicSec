/**
 * CosmicSec API Endpoints
 *
 * Typed functions for every API endpoint.
 * All functions use the centralized Axios client.
 */
import client from "./client";

/* ---------- Types ---------- */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user?: { id: string; email: string; full_name: string; role: string };
}

export interface Scan {
  id: string;
  target: string;
  scan_types: string[];
  status: string;
  progress: number;
  created_at: string;
  completed_at?: string;
  findings_count: number;
  severity_breakdown: Record<string, number>;
}

export interface Finding {
  id: string;
  scan_id: string;
  title: string;
  description: string;
  severity: string;
  cvss_score?: number;
  category: string;
  recommendation: string;
  detected_at: string;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface ReconResult {
  domain: string;
  dns_records: Record<string, unknown>[];
  subdomains: string[];
  technologies: string[];
  whois: Record<string, unknown>;
}

export interface AIAnalysis {
  analysis_id: string;
  risk_score: number;
  summary: string;
  recommendations: string[];
}

export interface Report {
  id: string;
  scan_id: string;
  format: string;
  status: string;
  download_url?: string;
  created_at: string;
}

export interface AgentSearchResult {
  id: string;
  name: string;
  status: string;
}

export interface SearchResults {
  scans: Scan[];
  findings: Finding[];
  agents: AgentSearchResult[];
  reports: Report[];
}

/* ---------- Auth ---------- */
export const auth = {
  login: (email: string, password: string) =>
    client.post<AuthResponse>("/api/auth/login", { email, password }).then((r) => r.data),

  register: (data: { email: string; password: string; full_name: string }) =>
    client.post<AuthResponse>("/api/auth/register", data).then((r) => r.data),

  forgotPassword: (email: string) =>
    client.post("/api/auth/forgot-password", { email }).then((r) => r.data),

  verify2FA: (code: string, token: string) =>
    client.post("/api/auth/verify-2fa", { code, token }).then((r) => r.data),

  refresh: () => client.post<AuthResponse>("/api/auth/refresh").then((r) => r.data),

  revokeAllSessions: () => client.post("/api/auth/sessions/revoke-all").then((r) => r.data),
};

/* ---------- Scans ---------- */
export const scans = {
  create: (target: string, scanTypes: string[], options?: Record<string, unknown>) =>
    client
      .post<Scan>("/api/scans", { target, scan_types: scanTypes, ...options })
      .then((r) => r.data),

  list: (page = 1, limit = 20) =>
    client
      .get<Scan[]>("/api/scans", { params: { limit, offset: (page - 1) * limit } })
      .then((r) => r.data),

  get: (id: string) => client.get<Scan>(`/api/scans/${id}`).then((r) => r.data),

  delete: (id: string) => client.delete(`/api/scans/${id}`).then((r) => r.data),
};

/* ---------- Findings ---------- */
export const findings = {
  list: (scanId: string) =>
    client.get<Finding[]>(`/api/scans/${scanId}/findings`).then((r) => r.data),
};

/* ---------- Recon ---------- */
export const recon = {
  query: (domain: string) =>
    client.get<ReconResult>(`/api/recon`, { params: { domain } }).then((r) => r.data),
};

/* ---------- AI ---------- */
export const ai = {
  analyze: (data: Record<string, unknown>) =>
    client.post<AIAnalysis>("/api/ai/analyze", data).then((r) => r.data),
};

/* ---------- Reports ---------- */
export const reports = {
  generate: (scanId: string, format = "pdf") =>
    client.post<Report>("/api/reports/generate", { scan_id: scanId, format }).then((r) => r.data),

  list: (page = 1, limit = 20) =>
    client
      .get<Report[]>("/api/reports", { params: { limit, offset: (page - 1) * limit } })
      .then((r) => r.data),
};

/* ---------- Settings ---------- */
export const settings = {
  saveScanDefaults: (defaults: Record<string, unknown>) =>
    client.post("/api/settings/scan-defaults", defaults).then((r) => r.data),

  saveGeneral: (data: Record<string, unknown>) =>
    client.post("/api/settings/general", data).then((r) => r.data),
};

/* ---------- Search ---------- */
export const search = {
  query: (q: string, limit = 10) =>
    client.get<SearchResults>("/api/search", { params: { q, limit } }).then((r) => r.data),
};

/* ---------- Admin ---------- */
export const admin = {
  listUsers: (page = 1, limit = 20) =>
    client
      .get("/api/admin/users", { params: { limit, offset: (page - 1) * limit } })
      .then((r) => r.data),

  createUser: (data: { email: string; full_name: string; role: string; password: string }) =>
    client.post("/api/admin/users", data).then((r) => r.data),

  deleteUser: (userId: string) => client.delete(`/api/admin/users/${userId}`).then((r) => r.data),

  auditLogs: (page = 1, limit = 25) =>
    client
      .get("/api/admin/audit-logs", { params: { limit, offset: (page - 1) * limit } })
      .then((r) => r.data),
};
