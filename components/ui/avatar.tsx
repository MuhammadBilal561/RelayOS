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
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-ink-900/[0.08] to-ink-900/[0.14] font-semibold text-ink-600 ring-1 ring-ink-900/[0.04]",
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
