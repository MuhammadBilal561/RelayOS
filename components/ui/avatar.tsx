import * as React from "react";
import { cn } from "@/lib/utils";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string | null;
  /** 24 = xs, 32 = sm, 40 = md */
  size?: "xs" | "sm" | "md";
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
};

export function Avatar({ name, size = "sm", className, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-ink-900/[0.08] font-semibold text-ink-500",
        sizes[size],
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {initials(name)}
    </div>
  );
}
