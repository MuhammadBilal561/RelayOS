"use client";

import { useEffect } from "react";
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
    <div className="flex min-h-screen items-center justify-center bg-paper-50 p-6">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-alert-50">
            <svg
              className="h-6 w-6 text-alert-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          <h2 className="font-display text-xl font-semibold text-ink-950">
            Something went wrong
          </h2>
          
          <p className="mt-2 text-sm text-ink-700/70">
            {error.message || "An unexpected error occurred while loading this page."}
          </p>

          {error.digest && (
            <p className="mt-2 font-mono text-xs text-ink-700/40">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-6 flex gap-3">
            <Button onClick={reset} variant="signal" className="flex-1">
              Try again
            </Button>
            <Button
              onClick={() => (window.location.href = "/overview")}
              variant="outline"
              className="flex-1"
            >
              Go to overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
