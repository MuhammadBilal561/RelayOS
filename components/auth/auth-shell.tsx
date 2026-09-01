import Link from "next/link";
import { CheckCircle2, CalendarCheck, Zap } from "lucide-react";

/**
 * Shared two-panel auth layout. On large screens a dark brand panel
 * carries the RelayOS story; on mobile only the form card is shown.
 */
export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <main className="flex min-h-screen bg-paper-50">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-ink-950 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(242,169,59,0.14),transparent_55%)]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(47,191,113,0.08),transparent_55%)]"
          aria-hidden="true"
        />
        <div className="relative z-10 flex w-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500/15 text-signal-400">
              <span className="font-display text-base font-bold">R</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-paper-50">
              RelayOS
            </span>
          </Link>

          <div className="max-w-md">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-xs text-paper-50/70">
              <span className="signal-dot signal-dot--live" aria-hidden="true" />
              relay status: answering leads in real time
            </p>
            <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.15] tracking-tight text-white">
              Your front office never sleeps.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-paper-50/70">
              RelayOS answers every inbound message in seconds, qualifies leads against your own
              knowledge base, and books the ones who are ready.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                { icon: Zap, text: "Answers every message in ~3 seconds" },
                { icon: CheckCircle2, text: "Qualifies leads with deterministic scoring" },
                { icon: CalendarCheck, text: "Books real appointments on your calendar" },
              ].map((item) => (
                <li key={item.text} className="flex items-center gap-3 text-sm text-paper-50/80">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-signal-400">
                    <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="font-mono text-[11px] text-paper-50/40">
            Supabase · Gemini · Google Calendar · n8n
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Compact brand for mobile */}
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-500/15 text-signal-600">
              <span className="font-display text-base font-bold">R</span>
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink-950">RelayOS</span>
          </div>

          <div className="surface px-6 py-7 sm:px-8">
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink-950">{title}</h1>
            <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </main>
  );
}
