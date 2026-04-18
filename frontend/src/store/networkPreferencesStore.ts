import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type TorMode = "enabled" | "disabled" | "auto";

interface NetworkPreferencesState {
  torMode: TorMode;
  setTorMode: (mode: TorMode) => void;
  cycleTorMode: () => void;
}

const TOR_MODE_ORDER: TorMode[] = ["disabled", "auto", "enabled"];

export function shouldUseTorForTarget(target: string, mode: TorMode): boolean {
  if (mode === "enabled") return true;
  if (mode === "disabled") return false;
  return target.trim().toLowerCase().endsWith(".onion");
}

export const useNetworkPreferencesStore = create<NetworkPreferencesState>()(
  persist(
    (set, get) => ({
      torMode: "auto",
      setTorMode: (mode) => set({ torMode: mode }),
      cycleTorMode: () => {
        const current = get().torMode;
        const index = TOR_MODE_ORDER.indexOf(current);
        const next = TOR_MODE_ORDER[(index + 1) % TOR_MODE_ORDER.length];
        set({ torMode: next });
      },
    }),
    {
      name: "cosmicsec-network-preferences",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);