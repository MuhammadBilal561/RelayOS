import * as React from "react";
import { cn } from "@/lib/utils";

export function Spinner({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      aria-hidden="true"
      {...props}
    />
  );
}
