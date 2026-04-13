import type {
  CosmicSecOptions, GatewayResponse, AuthResponse, User,
  Scan, CreateScanRequest, Finding, AnalysisResult,
  CorrelationReport, AgentRegisterRequest, RuntimeMode, ApiError,
} from './types.js';

export class CosmicSecClient {
  private readonly baseUrl: string;
  private token: string;
  private apiKey: string;
  private readonly timeout: number;
  private readonly onModeChange?: (mode: RuntimeMode) => void;

  constructor(opts: CosmicSecOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.token = opts.token ?? '';
    this.apiKey = opts.apiKey ?? '';
    this.timeout = opts.timeout ?? 30_000;
    this.onModeChange = opts.onModeChange;
  }

  setToken(token: string): void { this.token = token; }
  setApiKey(apiKey: string): void { this.apiKey = apiKey; }

  private async _fetch<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (this.apiKey) headers['X-API-Key'] = this.apiKey;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    const resp = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!resp.ok) {
      let err: ApiError = { detail: `HTTP ${resp.status}` };
      try { err = await resp.json() as ApiError; } catch { /* ignore */ }
      throw Object.assign(new Error(err.detail), { status: resp.status, ...err });
    }

    const envelope = await resp.json() as GatewayResponse<T>;
    if (envelope._runtime?.mode && this.onModeChange) {
      this.onModeChange(envelope._runtime.mode);
    }
    // Unwrap envelope or return raw response
    return (envelope.data !== undefined ? envelope.data : envelope) as T;
  }

  async health(): Promise<Record<string, unknown>> {
    return this._fetch('GET', '/health');
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await this._fetch<AuthResponse>('POST', '/auth/login', { email, password });
    if (res.access_token) this.setToken(res.access_token);
    return res;
  }

  async register(email: string, password: string, fullName: string): Promise<AuthResponse> {
    return this._fetch('POST', '/auth/register', { email, password, full_name: fullName });
  }

  async getScans(params?: { status?: string; limit?: number }): Promise<Scan[]> {
    const qs = new URLSearchParams(params as Record<string, string> ?? {}).toString();
    return this._fetch('GET', `/api/scans${qs ? `?${qs}` : ''}`);
  }

  async getScan(scanId: string): Promise<Scan> {
    return this._fetch('GET', `/api/scans/${scanId}`);
  }

  async createScan(req: CreateScanRequest): Promise<Scan> {
    return this._fetch('POST', '/api/scans', req);
  }

  async getScanFindings(scanId: string): Promise<Finding[]> {
    return this._fetch('GET', `/api/scans/${scanId}/findings`);
  }

  async getFindings(params?: { severity?: string; source?: string; limit?: number }): Promise<Finding[]> {
    const qs = new URLSearchParams(params as Record<string, string> ?? {}).toString();
    return this._fetch('GET', `/api/findings${qs ? `?${qs}` : ''}`);
  }

  async analyzeFindings(
    target: string,
    findings: Array<{ title: string; severity: string; description: string }>,
  ): Promise<AnalysisResult> {
    return this._fetch('POST', '/analyze', { target, findings });
  }

  async correlateFindings(findings: Finding[]): Promise<CorrelationReport> {
    return this._fetch('POST', '/correlate', { findings });
  }

  async startWorkflow(target: string): Promise<Record<string, unknown>> {
    return this._fetch('POST', '/ai/workflow/start', { target });
  }

  async registerAgent(req: AgentRegisterRequest): Promise<Record<string, unknown>> {
    return this._fetch('POST', '/api/agents/register', req);
  }

  async getAgents(): Promise<unknown[]> {
    return this._fetch('GET', '/api/agents');
  }

  async generateApiKey(name: string): Promise<{ key: string; id: string }> {
    return this._fetch('POST', '/profile/api-keys', { name });
  }
}
