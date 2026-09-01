import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 ease-out select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-paper-50 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-ink-950 text-paper-50 hover:bg-ink-800 shadow-sm",
        signal: "bg-signal-500 text-ink-950 hover:bg-signal-400 shadow-sm",
        outline:
          "border border-ink-900/15 bg-white text-ink-900 hover:bg-paper-50 hover:border-ink-900/25 shadow-sm",
        ghost: "bg-transparent text-ink-600 hover:bg-ink-900/[0.06] hover:text-ink-900",
        danger: "bg-alert-500 text-white hover:bg-alert-600 shadow-sm",
        "danger-ghost": "bg-transparent text-alert-600 hover:bg-alert-500/10",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

export { buttonVariants };
