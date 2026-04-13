import { useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from "lucide-react";
import { useNotificationStore, type Notification, type NotificationType } from "../store/notificationStore";

const DEFAULT_DURATION = 4000;

const STYLES: Record<NotificationType, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: { bg: "bg-emerald-950/80", border: "border-emerald-500/40", icon: CheckCircle, iconColor: "text-emerald-400" },
  error: { bg: "bg-rose-950/80", border: "border-rose-500/40", icon: AlertCircle, iconColor: "text-rose-400" },
  warning: { bg: "bg-amber-950/80", border: "border-amber-500/40", icon: AlertTriangle, iconColor: "text-amber-400" },
  info: { bg: "bg-blue-950/80", border: "border-blue-500/40", icon: Info, iconColor: "text-blue-400" },
};

function ToastItem({ notification }: { notification: Notification }) {
  const remove = useNotificationStore((s) => s.removeNotification);
  const { bg, border, icon: Icon, iconColor } = STYLES[notification.type];
  const duration = notification.duration ?? DEFAULT_DURATION;

  useEffect(() => {
    const timer = setTimeout(() => remove(notification.id), duration);
    return () => clearTimeout(timer);
  }, [notification.id, duration, remove]);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${border} ${bg} px-4 py-3 shadow-lg backdrop-blur-md`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${iconColor}`} />
      <p className="flex-1 text-sm text-slate-200">{notification.message}</p>
      <button
        onClick={() => remove(notification.id)}
        className="rounded p-0.5 text-slate-400 hover:text-slate-200"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function Toast() {
  const notifications = useNotificationStore((s) => s.notifications);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
      {notifications.map((n) => (
        <ToastItem key={n.id} notification={n} />
      ))}
    </div>
  );
}
