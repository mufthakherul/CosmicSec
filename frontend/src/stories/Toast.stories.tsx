import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "../components/Toast";
import { useNotificationStore } from "../store/notificationStore";

const meta: Meta<typeof Toast> = {
  title: "UI/Toast",
  component: Toast,
};

export default meta;
type Story = StoryObj<typeof Toast>;

function ToastPreview() {
  useEffect(() => {
    useNotificationStore.setState({
      notifications: [
        { id: "toast-1", type: "success", message: "Scan completed successfully." },
        { id: "toast-2", type: "warning", message: "Rate limit near threshold." },
        { id: "toast-3", type: "error", message: "Cloud sync failed. Retrying." },
      ],
      unreadCount: 3,
    });
    return () => {
      useNotificationStore.getState().clearAll();
    };
  }, []);

  return (
    <div className="h-40 w-105 bg-slate-950">
      <Toast />
    </div>
  );
}

export const AllSeverities: Story = {
  render: () => <ToastPreview />,
};
