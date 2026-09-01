import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-lg border border-ink-900/15 bg-white px-3 py-2 text-sm text-ink-900 transition-shadow duration-150",
      "placeholder:text-ink-400",
      "hover:border-ink-900/25",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/40 focus-visible:border-signal-500/60",
      "disabled:cursor-not-allowed disabled:bg-paper-100 disabled:text-ink-400",
      "aria-[invalid=true]:border-alert-500 aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-alert-500/25",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
