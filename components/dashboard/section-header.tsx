"use client";

import { ScrollReveal } from "@/components/ui/scroll-reveal";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
}

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="text-left">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/60">
        {eyebrow}
      </p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-ink-950">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700/60">
          {description}
        </p>
      )}
    </div>
  );
}