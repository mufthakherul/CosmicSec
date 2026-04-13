import { create } from "zustand";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
export type ScanStatus = "queued" | "running" | "complete" | "failed";

export interface Finding {
  id: string;
  title: string;
  severity: FindingSeverity;
  description: string;
  evidence: string;
  tool: string;
  target: string;
  timestamp: string;
}

export interface Scan {
  id: string;
  target: string;
  tool: string;
  status: ScanStatus;
  progress: number;
  findings: Finding[];
  createdAt: string;
}

interface ScanState {
  scans: Scan[];
  activeScan: Scan | null;
  setScans: (scans: Scan[]) => void;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, patch: Partial<Scan>) => void;
  setActiveScan: (scan: Scan | null) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  scans: [],
  activeScan: null,

  setScans: (scans) => set({ scans }),

  addScan: (scan) =>
    set((state) => ({ scans: [scan, ...state.scans] })),

  updateScan: (id, patch) =>
    set((state) => ({
      scans: state.scans.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      activeScan:
        state.activeScan?.id === id
          ? { ...state.activeScan, ...patch }
          : state.activeScan,
    })),

  setActiveScan: (scan) => set({ activeScan: scan }),
}));
