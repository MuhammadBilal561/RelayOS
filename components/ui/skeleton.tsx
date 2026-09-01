import * as React from "react";
import { cn } from "@/lib/utils";

/** Skeleton loading block. Renders a soft shimmer rectangle at the given size. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-shimmer rounded-md", className)} {...props} />;
}
