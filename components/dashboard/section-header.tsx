import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** Right-aligned actions, e.g. a primary button */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standard dashboard page header. Establishes the consistent hierarchy of
 * eyebrow -> page title -> description -> actions used on every route.
 */
export function SectionHeader({ eyebrow, title, description, actions, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-ink-950">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
