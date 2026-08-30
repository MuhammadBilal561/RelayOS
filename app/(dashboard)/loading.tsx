export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-paper-50">
      {/* Sidebar skeleton - fixed, stable while content loads */}
      <aside className="fixed top-0 left-0 z-40 flex h-screen w-16 shrink-0 flex-col justify-between border-r border-ink-800/10 bg-ink-950 px-2 py-4 md:w-60 md:px-3" aria-hidden="true">
        <div className="overflow-y-auto pr-2 md:pr-0">
          <div className="mb-3 hidden px-2 md:block">
            <div className="h-4 w-24 animate-shimmer rounded bg-ink-800/30" />
            <div className="mt-0.5 h-3 w-16 animate-shimmer rounded bg-ink-800/30" />
          </div>

          <div className="mb-4 hidden px-2 md:block">
            <div className="h-8 w-full animate-shimmer rounded-lg bg-ink-800/30" />
          </div>

          <div className="mb-6 flex justify-center md:hidden">
            <span className="signal-dot signal-dot--live" />
          </div>

          <nav className="space-y-0.5" role="navigation" aria-label="Main navigation">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 animate-shimmer rounded-lg bg-ink-800/30 mx-1 md:mx-0" />
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-1 border-t border-ink-800/10 pt-4">
          <div className="h-10 animate-shimmer rounded-lg bg-ink-800/30 mx-1 md:mx-0" />
          <div className="h-10 animate-shimmer rounded-lg bg-ink-800/30 mx-1 md:mx-0" />
        </div>
      </aside>

      {/* Main content skeleton - realistic page structure */}
      <main className="min-w-0 flex-1 overflow-y-auto md:ml-60 pt-4 md:pt-0" role="main" aria-busy="true" aria-label="Loading dashboard content">
        <div className="p-6 sm:p-10 space-y-6">
          {/* Header skeleton */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="h-3 w-24 animate-shimmer rounded bg-ink-200/50" />
              <div className="mt-2 h-6 w-48 animate-shimmer rounded bg-ink-200/50" />
            </div>
            <div className="h-8 w-24 animate-shimmer rounded-full bg-ink-200/50 shrink-0" />
          </div>

          {/* KPI cards skeleton - matches Overview page layout */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5" role="region" aria-label="Key metrics">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="rounded-xl border border-ink-800/10 bg-white p-6 shadow-panel animate-shimmer">
                <div className="h-3 w-24 animate-shimmer rounded bg-ink-200/50" />
                <div className="mt-3 h-8 w-16 animate-shimmer rounded bg-ink-200/50" />
              </div>
            ))}
          </div>

          {/* Content card skeleton - matches the analytics/revenue card */}
          <div className="rounded-xl border border-ink-800/10 bg-white p-6 shadow-panel animate-shimmer" role="region" aria-label="Content section">
            <div className="h-4 w-48 animate-shimmer rounded bg-ink-200/50" />
            <div className="mt-3 h-4 w-full animate-shimmer rounded bg-ink-200/50" />
            <div className="mt-2 h-4 w-3/4 animate-shimmer rounded bg-ink-200/50" />
          </div>

          {/* Table/kanban skeleton for Leads page - appears after header */}
          <div className="mt-6 animate-shimmer" role="region" aria-label="Data table" aria-hidden="true">
            <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[...Array(6)].map((_, colIdx) => (
                <div key={colIdx} className="min-w-[220px]">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <div className="h-4 w-16 animate-shimmer rounded bg-ink-200/50" />
                    <div className="h-4 w-8 animate-shimmer rounded bg-ink-200/50" />
                  </div>
                  <div className="space-y-2">
                    {[...Array(3)].map((_, rowIdx) => (
                      <div key={rowIdx} className="rounded-xl border border-ink-800/10 bg-white p-3 shadow-panel animate-shimmer">
                        <div className="flex items-start justify-between gap-2">
                          <div className="h-4 w-24 animate-shimmer rounded bg-ink-200/50 flex-1" />
                          <div className="h-5 w-12 animate-shimmer rounded-full bg-ink-200/50 shrink-0" />
                        </div>
                        <div className="mt-1 h-3 w-3/4 animate-shimmer rounded bg-ink-200/50" />
                        <div className="mt-2 h-2 w-20 animate-shimmer rounded bg-ink-200/50" />
                      </div>
                    ))}
                    <div className="rounded-xl border border-dashed border-ink-800/15 p-3 animate-shimmer">
                      <div className="h-3 w-12 animate-shimmer rounded bg-ink-200/50 mx-auto" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}