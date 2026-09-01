import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Compact variant for empty columns inside a grid (e.g. pipeline stages) */
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
  className,
  ...props
}: EmptyStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-900/15 px-3 py-6 text-center",
          className
        )}
        {...props}
      >
        <p className="text-xs font-medium text-ink-400">{title}</p>
        {description && <p className="text-[11px] leading-relaxed text-ink-400/80">{description}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-14 text-center",
        className
      )}
      {...props}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-paper-100 text-ink-400">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <h3 className="font-display text-sm font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
