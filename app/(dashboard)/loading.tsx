import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-paper-50">
      {/* Mobile top bar skeleton */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-900/10 bg-paper-50/85 px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>

      {/* Desktop sidebar skeleton */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.06] bg-ink-950 p-3 md:flex"
        aria-hidden="true"
      >
        <div className="mb-6 flex items-center gap-2.5 px-1">
          <Skeleton className="h-7 w-7 rounded-lg bg-ink-800/30" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16 bg-ink-800/30" />
            <Skeleton className="h-2 w-24 bg-ink-800/30" />
          </div>
        </div>
        <div className="mb-4">
          <Skeleton className="h-8 w-full rounded-lg bg-ink-800/30" />
        </div>
        <nav className="space-y-1" aria-label="Loading navigation">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg bg-ink-800/30" />
          ))}
        </nav>
        <div className="mt-auto space-y-1 pt-4">
          <Skeleton className="h-9 w-full rounded-lg bg-ink-800/30" />
          <Skeleton className="h-9 w-full rounded-lg bg-ink-800/30" />
        </div>
      </aside>

      {/* Main content skeleton */}
      <main className="min-w-0 pt-14 md:pl-60 md:pt-0" role="status" aria-label="Loading dashboard">
        <div className="mx-auto w-full max-w-6xl animate-fade-in p-6 sm:p-8">
          {/* Header skeleton */}
          <div className="max-w-xl">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-48" />
            <Skeleton className="mt-3 h-3 w-full" />
          </div>

          {/* KPI cards skeleton */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="surface p-4">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-14" />
              </div>
            ))}
          </div>

          {/* Content card skeleton */}
          <div className="surface mt-6 p-5">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-2/3" />
          </div>

          {/* Row skeleton */}
          <div className="surface mt-6 p-5">
            <Skeleton className="h-4 w-32" />
            <div className="mt-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
