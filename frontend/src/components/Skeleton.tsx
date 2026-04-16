/**
 * Loading Skeleton components — Phase V.2 (Animation & Micro-Interactions)
 * Shimmer loading placeholders for every data-loading state.
 */
import { cn } from "../lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-slate-800/70",
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex gap-4 px-4 py-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 rounded-lg border border-slate-800/50 px-4 py-3"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-16 ml-auto rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-2">
            <Skeleton className="h-3 w-20 mx-auto" />
            <Skeleton className="h-10 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <Skeleton className="h-4 w-32" />
          <SkeletonTable rows={4} />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <Skeleton className="h-4 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-2.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
