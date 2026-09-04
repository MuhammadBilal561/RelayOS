import * as React from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
  width?: "narrow" | "default" | "wide";
}

const widthClass = {
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export function PageShell({ children, className, width = "default" }: PageShellProps) {
  return (
    <div className={cn("mx-auto w-full px-5 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9", widthClass[width], className)}>
      {children}
    </div>
  );
}
