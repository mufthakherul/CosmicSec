export type RuntimeMode = 'static' | 'dynamic' | 'hybrid' | 'demo' | 'emergency';
export type RouteType = 'dynamic' | 'static' | 'static_fallback' | 'policy_denied';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingSource = 'web_scan' | 'agent_local' | 'api' | 'integration';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ScanType = 'network' | 'web' | 'api' | 'cloud' | 'container';

export interface RuntimeMetadata {
  mode: RuntimeMode;
  route: RouteType;
  degraded: boolean;
  trace_id: string;
  latency_ms: number;
}

export interface ContractMetadata {
  schema: string;
  version: string;
  degraded: boolean;
  consumer_hint: string;
}

export interface GatewayResponse<T = unknown> {
  data?: T;
  _runtime?: RuntimeMetadata;
  _contract?: ContractMetadata;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'analyst' | 'user' | 'viewer';
  is_active: boolean;
  totp_enabled: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Finding {
  id: string;
  scan_id?: string;
  title: string;
  severity: Severity;
  description: string;
  evidence?: string;
  tool?: string;
  target?: string;
  cve_id?: string;
  cvss_score?: number;
  mitre_technique?: string;
  source: FindingSource;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id?: string;
  target: string;
  scan_type: ScanType;
  tool?: string;
  status: ScanStatus;
  progress: number;
  source: FindingSource;
  summary?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateScanRequest {
  target: string;
  scan_types: ScanType[];
  depth?: number;
  options?: Record<string, unknown>;
}

export interface AnalysisResult {
  summary: string;
  risk_score: number;
  recommendations: string[];
}

export interface CorrelationReport {
  risk_score: number;
  total_findings: number;
  grouped_by_target: Record<string, Finding[]>;
  grouped_by_cve: Record<string, Finding[]>;
  grouped_by_technique: Record<string, Finding[]>;
  recommendations: string[];
}

export interface AgentRegisterRequest {
  agent_id: string;
  manifest: {
    tools: Array<{ name: string; version: string; capabilities: string[] }>;
    platform: string;
    version: string;
  };
}

export interface AgentStreamMessage {
  type: 'finding' | 'scan_complete' | 'tool_log' | 'error' | 'heartbeat';
  agent_id: string;
  scan_id?: string;
  payload: Record<string, unknown>;
}

export interface CosmicSecOptions {
  baseUrl: string;
  apiKey?: string;
  token?: string;
  timeout?: number;
  onModeChange?: (mode: RuntimeMode) => void;
}

export interface ApiError {
  detail: string;
  error_code?: string;
  trace_id?: string;
}
