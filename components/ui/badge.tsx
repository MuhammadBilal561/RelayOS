"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-ink-900/[0.06] text-ink-600",
        live: "bg-relay-500/10 text-relay-700",
        thinking: "bg-signal-500/10 text-signal-700",
        escalated: "bg-alert-500/10 text-alert-700",
        success: "bg-relay-500/10 text-relay-700",
        warning: "bg-signal-500/10 text-signal-700",
        danger: "bg-alert-500/10 text-alert-700",
        outline: "border border-ink-900/15 text-ink-500",
      },
      dot: {
        true: "py-1",
        false: "",
      },
    },
    defaultVariants: { variant: "neutral", dot: false },
  }
);

type DotTone = "live" | "thinking" | "escalated" | "idle" | "neutral";

const dotClass: Record<DotTone, string> = {
  live: "bg-relay-500",
  thinking: "bg-signal-500",
  escalated: "bg-alert-500",
  idle: "bg-ink-300",
  neutral: "bg-ink-400",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Render a small status dot before the label */
  dot?: boolean;
  /** Which color the dot should use */
  dotTone?: DotTone;
}

export function Badge({ className, variant, dot, dotTone = "neutral", ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, dot }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn("inline-block h-1.5 w-1.5 rounded-full", dotClass[dotTone])}
        />
      )}
      {props.children}
    </span>
  );
}
