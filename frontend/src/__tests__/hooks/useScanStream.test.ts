import { createElement } from "react";
import { render } from "@testing-library/react";
import { useScanStream } from "../../hooks/useScanStream";
import { useScanStore, type Scan } from "../../store/scanStore";

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  close() {}

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  emitClose() {
    this.onclose?.({} as CloseEvent);
  }
}

function HookHarness({ scanId }: { scanId?: string }) {
  useScanStream(scanId);
  return null;
}

function makeScan(id = "scan-1"): Scan {
  return {
    id,
    target: "example.com",
    tool: "nmap",
    status: "running",
    progress: 0,
    findings: [],
    createdAt: new Date().toISOString(),
  };
}

describe("useScanStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    localStorage.setItem("cosmicsec_token", "test-token");
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket as unknown as typeof WebSocket);
    useScanStore.setState({ scans: [makeScan()], activeScan: null, _hydrated: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("connects with scan id and auth token", () => {
    render(createElement(HookHarness, { scanId: "scan-1" }));
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toContain("/ws/scans/scan-1");
    expect(MockWebSocket.instances[0].url).toContain("token=test-token");
  });

  it("handles progress, finding, complete and error messages", () => {
    render(createElement(HookHarness, { scanId: "scan-1" }));
    const ws = MockWebSocket.instances[0];

    ws.emitMessage({ type: "progress", payload: { progress: 55 } });
    expect(useScanStore.getState().scans[0].progress).toBe(55);

    ws.emitMessage({
      type: "finding",
      payload: {
        id: "f-1",
        title: "SQLi",
        severity: "high",
        description: "desc",
        evidence: "payload",
        tool: "nuclei",
        target: "example.com",
        timestamp: new Date().toISOString(),
      },
    });
    expect(useScanStore.getState().scans[0].findings).toHaveLength(1);

    ws.emitMessage({ type: "complete", payload: {} });
    expect(useScanStore.getState().scans[0].status).toBe("completed");
    expect(useScanStore.getState().scans[0].progress).toBe(100);

    ws.emitMessage({ type: "error", payload: {} });
    expect(useScanStore.getState().scans[0].status).toBe("failed");
  });

  it("reconnects with exponential backoff after socket close", () => {
    render(createElement(HookHarness, { scanId: "scan-1" }));
    const first = MockWebSocket.instances[0];
    first.emitClose();
    vi.advanceTimersByTime(1000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });
});
