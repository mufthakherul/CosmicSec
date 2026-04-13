import type { AgentStreamMessage } from './types.js';

type AgentEvent = 'connect' | 'disconnect' | 'error';

export class AgentWebSocketClient {
  private ws: WebSocket | null = null;
  private readonly wsUrl: string;
  private readonly agentId: string;
  private readonly apiKey: string;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private readonly handlers = new Map<AgentEvent, Array<(data?: unknown) => void>>();
  private msgHandler: ((msg: AgentStreamMessage) => void) | null = null;

  constructor(wsUrl: string, agentId: string, apiKey: string) {
    this.wsUrl = wsUrl;
    this.agentId = agentId;
    this.apiKey = apiKey;
  }

  connect(): void {
    const url = `${this.wsUrl}?agent_id=${this.agentId}&api_key=${encodeURIComponent(this.apiKey)}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this._emit('connect');
      this.heartbeatTimer = setInterval(() => this._send({ type: 'heartbeat', agent_id: this.agentId, payload: {} }), 30_000);
    };

    this.ws.onclose = () => {
      this._emit('disconnect');
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    };

    this.ws.onerror = (ev) => this._emit('error', ev);

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as AgentStreamMessage;
        this.msgHandler?.(msg);
      } catch { /* ignore */ }
    };
  }

  disconnect(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.ws?.close();
  }

  sendFinding(msg: Omit<AgentStreamMessage, 'type' | 'agent_id'>): void {
    this._send({ ...msg, type: 'finding', agent_id: this.agentId });
  }

  onMessage(handler: (msg: AgentStreamMessage) => void): void {
    this.msgHandler = handler;
  }

  on(event: AgentEvent, handler: (data?: unknown) => void): void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  private _send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private _emit(event: AgentEvent, data?: unknown): void {
    this.handlers.get(event)?.forEach(h => h(data));
  }
}
