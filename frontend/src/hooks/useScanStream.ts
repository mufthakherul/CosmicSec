import { useEffect, useRef, useCallback } from "react";
import { useScanStore } from "../store/scanStore";
import type { Finding } from "../store/scanStore";

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

interface WsMessage {
  type: "finding" | "progress" | "complete" | "error";
  payload: unknown;
}

export function useScanStream(scanId: string | undefined) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(BASE_BACKOFF_MS);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!scanId || !mountedRef.current) return;

    // Derive ws/wss scheme from the API base URL env var, or fall back to
    // matching the current page protocol (http→ws, https→wss).
    const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
    let wsUrl: string;
    if (apiBase) {
      const httpBase = apiBase.replace(/\/+$/, "");
      wsUrl =
        httpBase.replace(/^https?/, (scheme) => (scheme === "https" ? "wss" : "ws")) +
        `/ws/scans/${scanId}`;
    } else {
      const scheme = window.location.protocol === "https:" ? "wss" : "ws";
      wsUrl = `${scheme}://${window.location.host}/ws/scans/${scanId}`;
    }

    // Append auth token as query parameter for WebSocket authentication
    const authToken = localStorage.getItem("cosmicsec_token");
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
        const msg = JSON.parse(event.data as string) as WsMessage;
        handleMessage(scanId, msg);
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

function handleMessage(scanId: string, msg: WsMessage): void {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const p = msg.payload as any;
  switch (msg.type) {
    case "finding": {
      const finding = p as Finding;
      const current = useScanStore.getState().scans.find((s) => s.id === scanId);
      if (current) {
        useScanStore.getState().updateScan(scanId, {
          findings: [...current.findings, finding],
        });
      }
      break;
    }
    case "progress":
      useScanStore.getState().updateScan(scanId, { progress: Number(p.progress ?? 0) });
      break;
    case "complete":
      useScanStore.getState().updateScan(scanId, { status: "completed", progress: 100 });
      break;
    case "error":
      useScanStore.getState().updateScan(scanId, { status: "failed" });
      break;
  }
}
