import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** Optional element rendered on the same row as the label (e.g. a count) */
  labelRight?: React.ReactNode;
  /** "default" spaces form fields at 16px; "sm" is for dense grids */
  spacing?: "default" | "sm";
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  labelRight,
  spacing = "default",
  className,
  children,
  ...props
}: FieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const hintId = htmlFor ? `${htmlFor}-hint` : undefined;

  return (
    <div className={cn(spacing === "default" ? "space-y-0" : "", className)} {...props}>
      {(label || labelRight) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label && <Label htmlFor={htmlFor}>{label}</Label>}
          {labelRight}
        </div>
      )}
      {children}
      {error ? (
        <p id={errorId} className="mt-1.5 flex items-center gap-1 text-xs text-alert-600">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
