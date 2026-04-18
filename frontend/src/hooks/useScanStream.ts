import { useEffect, useRef, useCallback } from "react";
import { useScanStore } from "../store/scanStore";
import type { Finding } from "../store/scanStore";
import { ensureApiGatewayBaseUrl, getApiGatewayWebSocketUrl } from "../api/runtimeEndpoints";

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

interface WsEnvelopeMessage {
  type: "finding" | "progress" | "complete" | "error";
  payload: unknown;
}

type RawScanStatus = {
  scan_id?: string;
  status?: "pending" | "running" | "completed" | "failed";
  progress?: number;
};

export function useScanStream(scanId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!scanId || !mountedRef.current) return;

    const openSocket = () => {
      const authToken = localStorage.getItem("cosmicsec_token");
      if (!authToken || authToken.startsWith("demo-preview")) {
        return;
      }

      const wsUrl = getApiGatewayWebSocketUrl(`/ws/scans/${scanId}`);

      // Append auth token as query parameter for WebSocket authentication
      const separator = wsUrl.includes("?") ? "&" : "?";
      const authenticatedUrl = authToken
        ? `${wsUrl}${separator}token=${encodeURIComponent(authToken)}`
        : wsUrl;

      const ws = new WebSocket(authenticatedUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        backoffRef.current = BASE_BACKOFF_MS;
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data as string) as unknown;
          handleMessage(scanId, parsed);
        } catch {
          // malformed message — ignore
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
        backoffRef.current = delay * 2;
        reconnectTimer.current = setTimeout(connect, delay);
      };
    };

    void ensureApiGatewayBaseUrl().finally(openSocket);
  }, [scanId]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current !== null) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);
}

function handleMessage(scanId: string, msg: unknown): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Support envelope-style payloads: { type, payload }
  if (
    typeof msg === "object" &&
    msg !== null &&
    "type" in msg &&
    typeof (msg as { type?: unknown }).type === "string"
  ) {
    const envelope = msg as WsEnvelopeMessage;
    const p = envelope.payload as any;
    switch (envelope.type) {
      case "finding": {
        const finding = p as Finding;
        const current = useScanStore.getState().scans.find((s) => s.id === scanId);
        if (current) {
          useScanStore.getState().updateScan(scanId, {
            findings: [...current.findings, finding],
          });
        }
        return;
      }
      case "progress":
        useScanStore.getState().updateScan(scanId, {
          status: "running",
          progress: Number(p.progress ?? 0),
        });
        return;
      case "complete":
        useScanStore.getState().updateScan(scanId, { status: "completed", progress: 100 });
        return;
      case "error":
        useScanStore.getState().updateScan(scanId, { status: "failed" });
        return;
    }
  }

  // Support raw status payloads emitted by scan_service: { scan_id, status, progress }
  if (typeof msg === "object" && msg !== null) {
    const raw = msg as RawScanStatus;
    if (raw.scan_id && raw.scan_id !== scanId) {
      return;
    }
    if (raw.status) {
      useScanStore.getState().updateScan(scanId, {
        status: raw.status,
        progress:
          typeof raw.progress === "number"
            ? raw.progress
            : raw.status === "completed"
              ? 100
              : raw.status === "running"
                ? 50
                : 0,
      });
    }
  }
}
