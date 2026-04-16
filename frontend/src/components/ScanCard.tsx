import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export type ScanCardStatus = "running" | "completed" | "failed";

interface ScanCardProps {
  target: string;
  tool: string;
  findings: number;
  startedAt: string;
  status: ScanCardStatus;
  onOpen?: () => void;
}

const statusStyle: Record<ScanCardStatus, { icon: ReactNode; label: string; className: string }> = {
  running: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    label: "Running",
    className: "text-amber-300 bg-amber-500/15 border-amber-500/30",
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Completed",
    className: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
  },
  failed: {
    icon: <AlertTriangle className="h-4 w-4" />,
    label: "Failed",
    className: "text-rose-300 bg-rose-500/15 border-rose-500/30",
  },
};

export function ScanCard({ target, tool, findings, startedAt, status, onOpen }: ScanCardProps) {
  const statusMeta = statusStyle[status];

  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{target}</h3>
          <p className="text-xs text-slate-400">{tool}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${statusMeta.className}`}>
          {statusMeta.icon}
          {statusMeta.label}
        </span>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
        <div className="rounded-lg bg-slate-950/80 p-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Findings</p>
          <p className="mt-1 text-sm font-semibold">{findings}</p>
        </div>
        <div className="rounded-lg bg-slate-950/80 p-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Started</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold">
            <Clock3 className="h-3.5 w-3.5" />
            {startedAt}
          </p>
        </div>
      </div>
      <Button onClick={onOpen} className="w-full">
        Open scan details
      </Button>
    </article>
  );
}
