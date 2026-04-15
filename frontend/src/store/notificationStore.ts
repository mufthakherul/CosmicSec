import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  markAllRead: () => void;
}

let _counter = 0;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const id = `notif-${Date.now()}-${++_counter}`;
        set((state) => ({
          notifications: [...state.notifications, { ...n, id }],
          unreadCount: state.unreadCount + 1,
        }));
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [], unreadCount: 0 }),

      markAllRead: () => set({ unreadCount: 0 }),
    }),
    {
      name: "cosmicsec-notifications",
      storage: createJSONStorage(() => {
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
      // Only persist unread count, not the full notification list (too large, stale quickly)
      partialize: (state) => ({
        unreadCount: state.unreadCount,
      }),
    },
  ),
);
