"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function Tooltip({ content, children, side = "top", align = "center" }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  // Position the tooltip absolutely relative to a relative wrapper so it
  // follows the trigger element instead of the viewport.
  const sideClass: Record<string, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };
  const alignClass: Record<string, string> = {
    start: "left-0 !translate-x-0",
    center: "",
    end: "right-0 !translate-x-0",
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      <div
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink-950 px-2 py-1 text-xs font-medium text-paper-50 shadow-pop transition-opacity duration-150",
          sideClass[side],
          alignClass[align],
          isVisible ? "opacity-100" : "opacity-0"
        )}
        aria-hidden={!isVisible}
      >
        {content}
      </div>
    </div>
  );
}
