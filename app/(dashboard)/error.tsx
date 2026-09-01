"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-paper-50 p-6 pt-24 md:pt-6">
      <div className="w-full max-w-md animate-scale-in">
        <Card>
          <CardContent className="px-6 py-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-alert-500/10 text-alert-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="font-display text-lg font-semibold tracking-tight text-ink-950">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              We couldn't load this page. This is usually temporary — try again, or head back to the
              overview.
            </p>

            {error.digest && (
              <p className="mt-4 rounded-lg bg-paper-100 px-3 py-2 font-mono text-[11px] text-ink-400">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
