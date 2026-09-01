import * as React from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ElementType;
  /** Which accent the icon container uses */
  tone?: "neutral" | "signal" | "relay" | "alert";
}

const toneStyles: Record<string, { icon: string; container: string }> = {
  neutral: { icon: "text-ink-500", container: "bg-ink-900/[0.06]" },
  signal: { icon: "text-signal-700", container: "bg-signal-500/10" },
  relay: { icon: "text-relay-700", container: "bg-relay-500/10" },
  alert: { icon: "text-alert-700", container: "bg-alert-500/10" },
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "neutral", className, ...props }: KpiCardProps) {
  const styles = toneStyles[tone];
  return (
    <div
      className={cn(
        "surface p-4 transition-shadow duration-200 hover:shadow-panel-hover",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink-500">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
              styles.container,
              styles.icon
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink-950">{value}</p>
      {hint && <p className="mt-1 truncate text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}
