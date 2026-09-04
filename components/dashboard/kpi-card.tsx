import * as React from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ElementType;
  tone?: "neutral" | "signal" | "relay" | "alert";
}

const toneStyles: Record<string, { wrap: string; icon: string; label: string; value: string; hint: string }> = {
  neutral: {
    wrap: "bg-[#fffdf8] border-ink-900/10",
    icon: "bg-ink-900/[0.06] text-ink-700",
    label: "text-ink-500",
    value: "text-ink-950",
    hint: "text-ink-400",
  },
  signal: {
    wrap: "bg-[#171b23] border-transparent",
    icon: "bg-white/10 text-signal-400",
    label: "text-white/55",
    value: "text-white",
    hint: "text-white/45",
  },
  relay: {
    wrap: "bg-[#e8f7ee] border-relay-500/15",
    icon: "bg-relay-500/15 text-relay-700",
    label: "text-relay-700/80",
    value: "text-ink-950",
    hint: "text-relay-700/70",
  },
  alert: {
    wrap: "bg-[#fdecec] border-alert-500/15",
    icon: "bg-alert-500/15 text-alert-700",
    label: "text-alert-700/80",
    value: "text-ink-950",
    hint: "text-alert-700/70",
  },
};

export function KpiCard({ label, value, hint, icon: Icon, tone = "neutral", className, ...props }: KpiCardProps) {
  const styles = toneStyles[tone];
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-[0_14px_30px_-22px_rgba(55,40,18,0.45)]",
        styles.wrap,
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[11px] font-semibold uppercase tracking-[0.14em]", styles.label)}>{label}</p>
        {Icon && (
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", styles.icon)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={cn("mt-4 font-display text-3xl font-semibold tracking-tight", styles.value)}>{value}</p>
      {hint && <p className={cn("mt-2 truncate text-[12px]", styles.hint)}>{hint}</p>}
    </div>
  );
}
