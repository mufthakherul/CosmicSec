import { useScanStore, type Scan } from "../../store/scanStore";

function makeScan(overrides: Partial<Scan> = {}): Scan {
  return {
    id: "scan-1",
    target: "example.com",
    tool: "nmap",
    status: "pending",
    progress: 0,
    findings: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("scanStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useScanStore.setState({
      scans: [],
      activeScan: null,
      _hydrated: true,
    });
  });

  it("adds scans and updates them by id", () => {
    const first = makeScan();
    useScanStore.getState().addScan(first);
    expect(useScanStore.getState().scans).toHaveLength(1);

    useScanStore.getState().updateScan("scan-1", {
      status: "running",
      progress: 42,
    });

    const updated = useScanStore.getState().scans[0];
    expect(updated.status).toBe("running");
    expect(updated.progress).toBe(42);
  });

  it("keeps active scan in sync when updateScan targets it", () => {
    const first = makeScan();
    useScanStore.getState().addScan(first);
    useScanStore.getState().setActiveScan(first);

    useScanStore.getState().updateScan("scan-1", { status: "completed", progress: 100 });

    expect(useScanStore.getState().activeScan?.status).toBe("completed");
    expect(useScanStore.getState().activeScan?.progress).toBe(100);
  });

  it("persists scans only (without activeScan)", () => {
    const first = makeScan();
    useScanStore.getState().addScan(first);
    useScanStore.getState().setActiveScan(first);

    const raw = localStorage.getItem("cosmicsec-scans");
    expect(raw).toBeTruthy();
    const persisted = JSON.parse(raw as string) as {
      state: { scans: Scan[]; activeScan?: unknown };
    };

    expect(persisted.state.scans).toHaveLength(1);
    expect(persisted.state.activeScan).toBeUndefined();
  });
});
