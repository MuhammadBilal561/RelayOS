export default function DashboardLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-paper-50">
      <div className="text-center">
        <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-4 border-ink-200 border-t-signal-600"></div>
        <p className="text-sm text-ink-700/60">Loading...</p>
      </div>
    </div>
  );
}
