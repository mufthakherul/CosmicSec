import { create } from "zustand";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

let _counter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  addNotification: (n) => {
    const id = `notif-${Date.now()}-${++_counter}`;
    set((state) => ({
      notifications: [...state.notifications, { ...n, id }],
    }));
  },

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
}));
