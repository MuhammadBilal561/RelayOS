"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#outcomes", label: "Outcomes" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-paper-50/80 transition-colors hover:bg-white/[0.08] lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="h-4 w-4" />
      </button>

      <div
        className={`fixed inset-0 z-50 overflow-hidden lg:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          className={`absolute inset-0 bg-ink-950/60 backdrop-blur-sm transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 flex h-full w-[280px] max-w-[85vw] flex-col bg-ink-950 p-5 shadow-float transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-semibold tracking-tight text-paper-50">RelayOS</span>
            <button
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-paper-50/60 transition-colors hover:bg-white/5 hover:text-paper-50"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-paper-50/70 transition-colors hover:bg-white/5 hover:text-paper-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-center text-sm font-medium text-paper-50/80 transition-colors hover:bg-white/5"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-signal-500 px-4 py-2.5 text-center text-sm font-medium text-ink-950 transition-colors hover:bg-signal-400"
            >
              Start free
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
