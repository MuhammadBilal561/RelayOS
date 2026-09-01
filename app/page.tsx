import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Target,
  Timer,
  Shield,
  FileText,
  Check,
  Sparkles,
  Terminal,
  Brain,
  Bot,
  BarChart3,
  Zap,
  Send,
  ArrowUpRight,
} from "lucide-react";
import dynamic from "next/dynamic";
import { LandingNav } from "@/components/landing/landing-nav";

const ScrollReveal = dynamic(
  () => import("@/components/ui/scroll-reveal").then((m) => m.ScrollReveal),
  { ssr: false }
);

/* ---------- Shared landing primitives (dark surfaces) ---------- */

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-sm transition-colors duration-200 hover:border-white/[0.14] hover:bg-white/[0.05] ${className}`}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-signal-400/90">{children}</p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <ScrollReveal className="mx-auto max-w-2xl text-center" threshold={0.15} rootMargin="0px 0px -10% 0px">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-2xl font-semibold leading-[1.15] tracking-tight text-white sm:text-[32px]">
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-paper-50/60">{description}</p>
      )}
    </ScrollReveal>
  );
}

/* ---------- Data ---------- */

const productDemos = [
  {
    icon: CheckCircle2,
    title: "Lead capture & qualification",
    description:
      "A visitor shares their name and email. RelayOS captures it, updates the lead score, and marks the lead qualified — no human needed.",
    event: "lead.qualified fired",
    badge: "live" as const,
    dot: "live" as const,
    color: "text-relay-400",
    chipBg: "bg-relay-500/10",
  },
  {
    icon: Calendar,
    title: "Booking",
    description:
      "The visitor wants an appointment. RelayOS checks real Google Calendar availability, confirms the slot, and creates a real calendar event.",
    event: "booking.created fired",
    badge: "live" as const,
    dot: "live" as const,
    color: "text-relay-400",
    chipBg: "bg-relay-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Human escalation",
    description:
      "The visitor asks something complex or requests a human. RelayOS escalates instantly, attaching an AI summary of the conversation.",
    event: "lead.escalated fired",
    badge: "escalated" as const,
    dot: "escalated" as const,
    color: "text-alert-400",
    chipBg: "bg-alert-500/10",
  },
];

const capabilities = [
  {
    icon: FileText,
    title: "RAG-grounded answers",
    description:
      "Answers come from your actual knowledge base — pricing, services, hours, policies — never improvised from training data.",
    tag: "RAG",
  },
  {
    icon: Bot,
    title: "Tool-calling front office",
    description:
      "The agent doesn't just chat — it captures leads, checks calendars, books appointments, and fires automation events to n8n.",
    tag: "Tool-calling",
  },
  {
    icon: Brain,
    title: "Deterministic lead scoring",
    description:
      "A transparent, rule-based function scores every lead — six weighted signals, consistent and auditable, not an LLM self-report.",
    tag: "Rule-based",
  },
  {
    icon: BarChart3,
    title: "Analytics & revenue recovery",
    description:
      "Track funnel stages, response time, and revenue recovered from actual bookings. Metrics update live as leads progress.",
    tag: "Revenue",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Embed",
    description: "Paste one script tag before the closing body tag on any site. The widget loads instantly.",
    tag: "Vanilla JS",
  },
  {
    step: "02",
    title: "Ingest",
    description: "Add pricing, policies, and service docs. RelayOS chunks, embeds, and indexes them with pgvector.",
    tag: "pgvector + RAG",
  },
  {
    step: "03",
    title: "Engage",
    description: "Visitors chat with the AI front office — grounded answers, live calendar, human escalation when needed.",
    tag: "Tool-calling",
  },
  {
    step: "04",
    title: "Convert",
    description: "Scoring, bookings, automation events, and revenue analytics turn conversations into measurable outcomes.",
    tag: "n8n webhooks",
  },
];

const outcomes = [
  {
    icon: DollarSign,
    label: "Revenue recovered",
    value: "$12,750",
    subtitle: "17 bookings × $750 avg job value",
    color: "text-signal-400",
  },
  {
    icon: Target,
    label: "Conversion rate",
    value: "29.3%",
    subtitle: "58 leads → 17 booked in 30 days",
    color: "text-relay-400",
  },
  {
    icon: Timer,
    label: "Avg response time",
    value: "3s",
    subtitle: "Visitor message → AI reply",
    color: "text-signal-400",
  },
];

const automationEvents = [
  { name: "lead.qualified", description: "Contact captured", color: "text-signal-400" },
  { name: "lead.escalated", description: "Human handoff", color: "text-alert-400" },
  { name: "booking.created", description: "Appointment booked", color: "text-relay-400" },
];

/* ---------- Hero widget mockup ---------- */

function HeroMockup() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl">
      <div
        className="pointer-events-none absolute -inset-x-6 -top-12 -bottom-8 bg-[radial-gradient(ellipse_at_center,_rgba(242,169,59,0.08),transparent_60%)] sm:-inset-x-8"
        aria-hidden="true"
      />

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/80 shadow-float">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" aria-hidden="true" />
          <span className="ml-3 rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-paper-50/40">
            yourbusiness.com
          </span>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_280px]">
          {/* Simulated conversation */}
          <div className="space-y-3 rounded-xl border border-white/[0.06] bg-ink-950/60 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-500/15 text-signal-400">
                <span className="font-display text-[10px] font-bold">R</span>
              </span>
              <p className="font-mono text-[10px] text-paper-50/40">aurora-front-office</p>
              <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-relay-400">
                <span className="signal-dot signal-dot--live" aria-hidden="true" /> online
              </span>
            </div>

            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2 text-[13px] leading-relaxed text-paper-50/85">
              Hi! I'm the Aurora front office. Need a quote or want to book a tune-up?
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-signal-500 px-3.5 py-2 text-[13px] leading-relaxed text-ink-950">
              Yes — can I get my furnace serviced on Thursday morning?
            </div>
            <div className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2 text-[13px] text-paper-50/85">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-relay-400" aria-hidden="true" />
              Thursday 9:00 AM is open — booking it now…
            </div>
            <div className="ml-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-br-md bg-relay-500/15 px-3.5 py-2 text-[13px] text-relay-300">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Confirmed — a calendar invite is on its way.
            </div>
          </div>

          {/* Event feed */}
          <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-950/60 p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-50/40">
              Automation events
            </p>
            {[
              { name: "lead.qualified", state: "text-relay-400", dot: "live" as const },
              { name: "booking.created", state: "text-relay-400", dot: "live" as const },
              { name: "lead.escalated", state: "text-alert-400", dot: "escalated" as const },
            ].map((event) => (
              <div key={event.name} className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2">
                <span className={`signal-dot signal-dot--${event.dot}`} aria-hidden="true" />
                <span className="truncate font-mono text-[11px] text-paper-50/70">{event.name}</span>
                <span className="ml-auto text-paper-50/30" aria-hidden="true">
                  ✓
                </span>
              </div>
            ))}
            <div className="mt-auto flex items-center gap-2 rounded-lg border border-dashed border-white/10 px-3 py-2 font-mono text-[11px] text-paper-50/40">
              <Zap className="h-3.5 w-3.5 text-signal-400" aria-hidden="true" />
              routed to your n8n
            </div>
          </div>
        </div>
      </div>

      {/* Floating chip */}
      <div className="absolute -right-3 top-16 hidden animate-fade-in-up items-center gap-2 rounded-full border border-white/10 bg-ink-900 px-3 py-1.5 shadow-pop delay-500 sm:flex">
        <span className="signal-dot signal-dot--thinking" aria-hidden="true" />
        <span className="font-mono text-[11px] text-paper-50/80">reply in ~3s</span>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-paper-50">
      {/* ---------- NAV ---------- */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/[0.06] bg-ink-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5" aria-label="RelayOS home">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-500/15 text-signal-400">
              <span className="font-display text-sm font-bold">R</span>
            </span>
            <span className="font-display text-base font-semibold tracking-tight text-white">RelayOS</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {[
              { href: "#product", label: "Product" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#outcomes", label: "Outcomes" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm text-paper-50/60 transition-colors duration-150 hover:text-paper-50"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm text-paper-50/70 transition-colors duration-150 hover:text-paper-50"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button variant="signal" size="sm" className="h-8 px-3.5">
                Start free
              </Button>
            </Link>
          </div>

          <div className="flex items-center lg:hidden">
            <LandingNav />
          </div>
        </div>
      </header>

      {/* ---------- 1. HERO ---------- */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-28 sm:pt-32">
        <div className="flex animate-fade-in-up flex-col items-center text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs text-paper-50/70">
            <span className="signal-dot signal-dot--live" aria-hidden="true" />
            relay status: answering leads in real time
          </p>

          <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            Never let a lead
            <span className="block text-gradient-amber">go cold.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-paper-50/60 sm:text-lg">
            RelayOS is an AI front office for service businesses. It answers every inbound
            message in seconds, qualifies the lead against your own knowledge base, and books
            the ones who are ready — before the competition calls back.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/signup">
              <Button variant="signal" size="lg" className="h-11 w-full px-6 sm:w-auto">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Start free
              </Button>
            </Link>
            <Link
              href="/widget/demo-widget-key"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.02] px-6 text-sm font-medium text-paper-50/85 transition-colors duration-150 hover:bg-white/5 sm:w-auto"
            >
              <Terminal className="h-4 w-4" aria-hidden="true" />
              Try the live widget
            </Link>
          </div>

          <p className="mt-5 font-mono text-[11px] text-paper-50/40">
            No credit card · 3-minute setup · Google Calendar + n8n ready
          </p>
        </div>

        <HeroMockup />
      </section>

      {/* ---------- 2. PRODUCT DEMO ---------- */}
      <section id="product" className="scroll-mt-14 border-t border-white/[0.06] bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="See it in action"
            title="Three workflows. Zero missed leads."
            description="The core loops that turn conversations into booked jobs — live, automated, and measurable."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {productDemos.map((demo, index) => (
              <ScrollReveal key={demo.title} className={`reveal-delay-${(index + 1) * 100}`} threshold={0.15}>
                <GlassCard className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${demo.chipBg} ${demo.color}`}>
                      <demo.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-50/40">
                      Live demo
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-white">
                    {demo.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-paper-50/60">{demo.description}</p>

                  <div className="mt-5 flex items-center gap-2 border-t border-white/[0.06] pt-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] ${
                        demo.badge === "live"
                          ? "bg-relay-500/10 text-relay-400"
                          : "bg-alert-500/10 text-alert-400"
                      }`}
                    >
                      <span className={`signal-dot signal-dot--${demo.dot}`} aria-hidden="true" />
                      {demo.event}
                    </span>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 3. CORE CAPABILITIES ---------- */}
      <section className="border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="Core capabilities"
            title="Not a chatbot. A front office."
            description="Four capabilities that make RelayOS genuinely useful — answers, actions, scores, and proof."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap, index) => (
              <ScrollReveal key={cap.title} className={`reveal-delay-${(index + 1) * 100}`} threshold={0.15}>
                <GlassCard className="flex h-full flex-col">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-signal-400">
                    <cap.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-sm font-semibold tracking-tight text-white">
                    {cap.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[13px] leading-relaxed text-paper-50/55">{cap.description}</p>
                  <span className="mt-4 inline-flex w-fit items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-paper-50/60">
                    {cap.tag}
                  </span>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. HOW IT WORKS ---------- */}
      <section id="how-it-works" className="scroll-mt-14 border-t border-white/[0.06] bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="How it works"
            title="From embed to outcome in four steps."
            description="One script tag. Four steps. Measurable results."
          />

          <div className="relative mt-14">
            <div
              className="absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-signal-500/40 via-white/10 to-transparent lg:block"
              aria-hidden="true"
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.map((step, index) => (
                <ScrollReveal key={step.title} className={`reveal-delay-${(index + 1) * 100}`} threshold={0.15}>
                  <div className="relative">
                    <span className="relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-ink-950 font-mono text-xs font-semibold text-signal-400 shadow-pop">
                      {step.step}
                    </span>
                    <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-paper-50/60">{step.description}</p>
                    <span className="mt-3 inline-flex items-center rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-paper-50/60">
                      {step.tag}
                    </span>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 5. OUTCOMES / PROOF ---------- */}
      <section id="outcomes" className="scroll-mt-14 border-t border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <SectionHeading
            eyebrow="Outcomes & proof"
            title="Measurable results. Verified infrastructure."
            description="RelayOS turns conversations into measurable outcomes and connects them to your workflows."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {outcomes.map((outcome, index) => (
              <ScrollReveal key={outcome.label} className={`reveal-delay-${(index + 1) * 100}`} threshold={0.15}>
                <GlassCard className="flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-paper-50/60">{outcome.label}</p>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-paper-50/50">
                      <outcome.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className={`mt-3 font-display text-3xl font-semibold tracking-tight ${outcome.color}`}>
                    {outcome.value}
                  </p>
                  <p className="mt-1 text-xs text-paper-50/50">{outcome.subtitle}</p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="reveal-delay-200 mt-8" threshold={0.15}>
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-2.5">
              {automationEvents.map((event) => (
                <span
                  key={event.name}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-paper-50/70"
                >
                  <span className="font-mono">{event.name}</span>
                  <span className="hidden text-paper-50/40 sm:inline">·</span>
                  <span className="hidden text-paper-50/40 sm:inline">{event.description}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-paper-50/40">
              Each event routes to its own n8n webhook — configured independently in Settings.
            </p>
          </ScrollReveal>

          <ScrollReveal className="reveal-delay-300 mt-10" threshold={0.15}>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] text-paper-50/40">
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" /> Next.js 14
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" /> Supabase + pgvector
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" /> Gemini
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" /> Google Calendar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-relay-400" aria-hidden="true" /> n8n
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- 6. FINAL CTA ---------- */}
      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(242,169,59,0.1),transparent_60%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center sm:py-24">
          <ScrollReveal threshold={0.15}>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-mono text-xs text-paper-50/70">
              <span className="signal-dot signal-dot--live" aria-hidden="true" />
              Ready to stop losing leads?
            </p>
            <h2 className="mt-6 font-display text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl">
              Turn more conversations into qualified leads and booked jobs.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-paper-50/60">
              Start free. Connect your knowledge base. Watch RelayOS answer, qualify, and book —
              while you focus on the work.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button variant="signal" size="lg" className="h-11 w-full px-6 sm:w-auto">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Start free
                </Button>
              </Link>
              <Link
                href="/widget/demo-widget-key"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.02] px-6 text-sm font-medium text-paper-50/80 transition-colors duration-150 hover:bg-white/5 sm:w-auto"
              >
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Try the live widget
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-white/[0.06] bg-ink-950">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5" aria-label="RelayOS home">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-500/15 text-signal-400">
                  <span className="font-display text-sm font-bold">R</span>
                </span>
                <span className="font-display text-base font-semibold tracking-tight text-white">RelayOS</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper-50/60">
                The autonomous AI front office for service businesses. Answers instantly, qualifies
                leads, books appointments, and connects to your workflow.
              </p>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight text-white">Product</h3>
              <nav className="mt-4 space-y-2.5" aria-label="Product">
                <Link href="/widget/demo-widget-key" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Live widget demo
                </Link>
                <Link href="/login" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Dashboard overview
                </Link>
                <Link href="/analytics" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Analytics & revenue
                </Link>
                <Link href="/settings" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Settings & automations
                </Link>
              </nav>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight text-white">Resources</h3>
              <nav className="mt-4 space-y-2.5" aria-label="Resources">
                <Link href="/signup" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Get started free
                </Link>
                <a href="https://github.com/MuhammadBilal561/RelayOS" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  GitHub repository
                </a>
                <a href="https://n8n.io/workflows" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  n8n workflow templates
                </a>
                <a href="https://github.com/MuhammadBilal561/RelayOS/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/60 transition-colors hover:text-paper-50">
                  Documentation
                </a>
              </nav>
            </div>

            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight text-white">System</h3>
              <div className="mt-4 space-y-2 font-mono text-[11px] text-paper-50/40">
                <p className="flex items-center gap-1.5">
                  <span className="signal-dot signal-dot--live" aria-hidden="true" /> all systems operational
                </p>
                <p className="flex items-center gap-1.5">
                  <Send className="h-3 w-3 text-signal-400" aria-hidden="true" /> 3s median reply
                </p>
                <p className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-relay-400" aria-hidden="true" /> revenue tracked live
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
            <p className="text-xs text-paper-50/40">
              © {new Date().getFullYear()} RelayOS. All rights reserved.
            </p>
            <p className="text-xs text-paper-50/40">
              Built with Next.js, TypeScript, and open-source tools.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
