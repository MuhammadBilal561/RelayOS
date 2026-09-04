import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="dashboard-shell">
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-ink-900/8 bg-[#faf6ef]/90 px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>

      <aside
        className="dash-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col p-3 md:flex"
        aria-hidden="true"
      >
        <div className="mb-6 mt-2 flex items-center gap-3 px-1">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2 w-24" />
          </div>
        </div>
        <div className="mb-5">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <nav className="space-y-1.5" aria-label="Loading navigation">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </nav>
        <div className="mt-auto space-y-1.5 pt-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>

      <main className="min-w-0 pt-14 md:pl-64 md:pt-0" role="status" aria-label="Loading dashboard">
        <div className="mx-auto w-full max-w-6xl animate-fade-in px-5 py-7 sm:px-8 sm:py-9">
          <div className="max-w-xl">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-56" />
            <Skeleton className="mt-3 h-4 w-full" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-ink-900/10 bg-[#fffdf8] p-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-8 w-14" />
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl bg-ink-950 p-6">
              <Skeleton className="h-3 w-20 bg-white/10" />
              <Skeleton className="mt-3 h-6 w-40 bg-white/10" />
              <Skeleton className="mt-3 h-4 w-full bg-white/10" />
            </div>
            <div className="rounded-2xl border border-ink-900/10 bg-[#fffdf8] p-5">
              <Skeleton className="h-4 w-36" />
              <div className="mt-4 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
