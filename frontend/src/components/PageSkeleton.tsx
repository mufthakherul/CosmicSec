/**
 * PageSkeleton — Loading placeholder shown while a lazy-loaded route chunk
 * is being fetched. Matches the app layout (sidebar + content area).
 */
export function PageSkeleton() {
  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-4 space-y-4">
        <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
        <div className="space-y-3 mt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-full bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
          <div className="h-8 w-32 bg-gray-800 rounded animate-pulse" />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-gray-900 rounded-lg p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
