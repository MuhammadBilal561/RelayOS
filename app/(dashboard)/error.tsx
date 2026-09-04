"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6 pt-24 md:pt-6">
      <div className="w-full max-w-md animate-scale-in overflow-hidden rounded-2xl border border-ink-900/8 bg-[#fffdf8] shadow-[0_24px_50px_-28px_rgba(17,27,35,0.55)]">
        <div className="bg-ink-950 px-6 py-5 text-white">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-alert-500/20 text-alert-400">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight">Something went wrong</h1>
        </div>
        <div className="px-6 py-6">
          <p className="text-sm leading-relaxed text-ink-500">
            We couldn&apos;t load this page. This is usually temporary — try again, or head back to the overview.
          </p>

          {error.digest && (
            <p className="mt-4 rounded-xl bg-[#efe8dc] px-3 py-2 font-mono text-[11px] text-ink-500">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={reset} variant="signal" className="flex-1">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </Button>
            <Button
              onClick={() => (window.location.href = "/overview")}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Go to overview
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
