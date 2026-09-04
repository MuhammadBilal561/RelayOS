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
    <div className={cn("mx-auto w-full px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10", widthClass[width], className)}>
      {children}
    </div>
  );
}
