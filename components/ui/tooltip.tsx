"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const childRef = React.useRef<HTMLDivElement>(null);

  return (
    <div className="relative inline-block">
      <div
        ref={childRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className={cn(
            "fixed z-50 pointer-events-none text-xs font-medium text-paper-50 bg-ink-950 px-2 py-1 rounded shadow-lg",
            {
              "bottom-full left-1/2 -translate-x-1/2 mb-1": side === "top",
              "top-full left-1/2 -translate-x-1/2 mt-1": side === "bottom",
              "right-full top-1/2 -translate-y-1/2 ml-1": side === "left",
              "left-full top-1/2 -translate-y-1/2 mr-1": side === "right",
            }
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}