"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "business", label: "Business & revenue" },
  { id: "calendar", label: "Google Calendar" },
  { id: "widget", label: "Widget" },
  { id: "automations", label: "Automations" },
  { id: "add-business", label: "Agency mode" },
];

export function SettingsNav() {
  const [active, setActive] = useState<string>("business");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Settings sections" className="space-y-0.5 rounded-xl border border-ink-900/[0.06] bg-white/70 p-1.5">
      {SECTIONS.map((section) => {
        const isActive = active === section.id;
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "relative block rounded-lg px-3 py-1.5 text-[13px] transition-colors duration-150",
              isActive
                ? "bg-ink-950 font-medium text-white"
                : "text-ink-500 hover:bg-ink-900/[0.04] hover:text-ink-900"
            )}
          >
            {section.label}
          </a>
        );
      })}
    </nav>
  );
}
