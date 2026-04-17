import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";
/** Values mirror the scan service ScanStatus enum: pending | running | completed | failed */
export type ScanStatus = "pending" | "running" | "completed" | "failed";

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
  _hydrated: boolean;
  setScans: (scans: Scan[]) => void;
  addScan: (scan: Scan) => void;
  updateScan: (id: string, patch: Partial<Scan>) => void;
  setActiveScan: (scan: Scan | null) => void;
}

/** TTL for cached scans: 5 minutes */
const CACHE_TTL_MS = 5 * 60 * 1000;

export const useScanStore = create<ScanState>()(
  persist(
    (set) => ({
      scans: [],
      activeScan: null,
      _hydrated: false,

      setScans: (scans) => set({ scans }),

      addScan: (scan) => set((state) => ({ scans: [scan, ...state.scans] })),

      updateScan: (id, patch) =>
        set((state) => ({
          scans: state.scans.map((s) => (s.id === id ? { ...s, ...patch } : s)),
          activeScan:
            state.activeScan?.id === id ? { ...state.activeScan, ...patch } : state.activeScan,
        })),

      setActiveScan: (scan) => set({ activeScan: scan }),
    }),
    {
      name: "cosmicsec-scans",
      storage: createJSONStorage(() => {
        // Fallback: if localStorage is unavailable (private browsing), use no-op
        try {
          localStorage.setItem("__test__", "1");
          localStorage.removeItem("__test__");
          return localStorage;
        } catch {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      // Don't persist activeScan (transient) or internal flags
      partialize: (state) => ({
        scans: state.scans,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._hydrated = true;
          // Clear scans older than TTL
          const cutoff = Date.now() - CACHE_TTL_MS;
          state.scans = state.scans.filter((s) => new Date(s.createdAt).getTime() > cutoff);
        }
      },
    },
  ),
);
