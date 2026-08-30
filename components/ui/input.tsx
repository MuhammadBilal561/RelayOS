import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-ink-800/15 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-700/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40 focus-visible:border-signal-500",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
