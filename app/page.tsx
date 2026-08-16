import Link from "next/link";
import { Button } from "@/components/ui/button";

const timeline = [
  {
    time: "00:03",
    title: "Answers instantly",
    body: "A visitor asks a question at 11:47pm. RelayOS answers it — grounded in your actual pricing and service docs — before they've even switched tabs.",
  },
  {
    time: "00:20",
    title: "Qualifies the lead",
    body: "It asks the right follow-up questions, captures their contact details the moment they're offered, and scores the lead by intent and urgency.",
  },
  {
    time: "00:45",
    title: "Books it, or hands it off",
    body: "Ready to book? It puts them straight on your calendar. Not sure yet, or asking something tricky? It flags a human with full context, not a cold transcript.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-paper-50">
      {/* ---------- Hero ---------- */}
      <section className="mx-auto flex max-w-5xl flex-col items-start px-6 pb-20 pt-24 sm:pt-32">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-paper-50/70">
          <span className="signal-dot signal-dot--live" />
          relay status: answering leads in real time
        </div>

        <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Never let a lead <span className="text-signal-500">go cold.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper-50/70">
          RelayOS is an AI front office for service businesses — it answers every
          inbound message in seconds, qualifies the lead against your own
          knowledge base, and books the ones who are ready. No more hours-long
          reply times losing you the job.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/login">
            <Button variant="signal" size="lg">
              Open the dashboard
            </Button>
          </Link>
          <Link href="/widget/demo-widget-key" className="text-sm text-paper-50/60 underline underline-offset-4 hover:text-paper-50">
            See the live widget →
          </Link>
        </div>
      </section>

      {/* ---------- Timeline: this is a genuine sequence, so timestamps
          earn their place instead of decorating the section. ---------- */}
      <section className="border-t border-white/10 bg-ink-900/60">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="mb-12 font-mono text-xs uppercase tracking-[0.2em] text-paper-50/40">
            what happens after someone messages you
          </p>

          <div className="grid gap-10 sm:grid-cols-3">
            {timeline.map((step) => (
              <div key={step.time} className="border-l border-white/10 pl-5">
                <p className="font-mono text-sm text-signal-500">{step.time}</p>
                <h3 className="mt-3 font-display text-lg font-medium">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper-50/60">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Close ---------- */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-medium sm:text-3xl">
          Built on infrastructure that scales — <span className="text-paper-50/50">starting at zero cost.</span>
        </h2>
        <div className="mt-8">
          <Link href="/login">
            <Button variant="outline" className="border-white/15 text-paper-50 hover:bg-white/5">
              Get started
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
