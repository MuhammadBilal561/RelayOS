import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, Clock, ChevronRight, ExternalLink, ArrowRight, Zap, AlertTriangle, Info, TrendingUp, DollarSign, Target, Timer, Shield, FileText, Check, Sparkles, Terminal, Brain, Bot, BarChart3, Layers, Scale, Mail, Flag } from "lucide-react";
import dynamic from "next/dynamic";

const ScrollReveal = dynamic(
  () => import("@/components/ui/scroll-reveal").then((m) => m.ScrollReveal),
  { ssr: false }
);

const Card = ({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-xl border border-ink-800/10 bg-white shadow-panel p-5 ${className}`} {...props}>
    {children}
  </div>
);

const SectionHeader = ({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) => (
  <ScrollReveal className="text-center" threshold={0.15} rootMargin="0px 0px -10% 0px">
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-paper-50/60">{eyebrow}</p>
    <h2 className="mt-3 font-display text-2xl font-semibold text-white sm:text-3xl">{title}</h2>
    {description && <p className="mt-4 max-w-2xl mx-auto text-sm leading-relaxed text-paper-50/80">{description}</p>}
  </ScrollReveal>
);

const productDemos = [
  {
    icon: CheckCircle2,
    title: "Lead Capture",
    description: "Visitor shares name and email. RelayOS captures it instantly, updates the lead score, and marks the lead as qualified — all without a human lifting a finger.",
    event: "lead.qualified fired",
    variant: "live",
    color: "text-relay-600",
  },
  {
    icon: Calendar,
    title: "Booking",
    description: "The visitor wants to book an appointment. RelayOS checks real Google Calendar availability, confirms the slot, and creates a real calendar event — no double-booking, no back-and-forth.",
    event: "booking.created fired",
    variant: "live",
    color: "text-relay-600",
  },
  {
    icon: AlertTriangle,
    title: "Human Escalation",
    description: "The visitor asks something complex or requests a human. RelayOS escalates instantly — generating an AI summary of the conversation and firing the lead.escalated event for your team.",
    event: "lead.escalated fired",
    variant: "alert",
    color: "text-alert-600",
  },
];

const capabilities = [
  {
    icon: FileText,
    title: "RAG-Grounded Answers",
    description: "Answers are generated from your actual knowledge base — pricing, services, hours, policies — not from the model's training data. If RelayOS doesn't find relevant content, it says so instead of improvising.",
    tags: ["RAG"],
    color: "text-ink-600",
  },
  {
    icon: Bot,
    title: "Tool-Calling AI Front Office",
    description: "The agent doesn't just chat — it acts. It captures lead details, checks real Google Calendar availability, books confirmed appointments, escalates to a human with an AI summary, and fires automation events to n8n.",
    tags: ["Tool-calling"],
    color: "text-ink-600",
  },
  {
    icon: Brain,
    title: "Deterministic Lead Scoring",
    description: "Scores are computed by a transparent, rule-based function — not an LLM self-evaluation. Six weighted signals (contact info, urgency keywords, engagement depth) produce consistent, auditable scores every time.",
    tags: ["Rule-based"],
    color: "text-relay-500",
  },
  {
    icon: BarChart3,
    title: "Analytics & Revenue Recovery",
    description: "Track funnel stages, average response time, conversion rate, and revenue recovered based on actual bookings and your configured average job value. Metrics update in real time as leads progress through the pipeline.",
    tags: ["Revenue"],
    color: "text-ink-600",
  },
];

const howItWorks = [
  { step: 1, title: "Embed", description: "Paste one script tag before the closing body tag on any site. The widget loads instantly — no build step, no framework dependency.", tags: ["Vanilla JS", "iframe sandbox"] },
  { step: 2, title: "Ingest", description: "Add pricing, policies, and service docs in the dashboard. RelayOS chunks, embeds, and indexes your content with pgvector so every answer is grounded in your actual business data.", tags: ["pgvector", "Gemini embeddings", "RAG"] },
  { step: 3, title: "Engage", description: "Visitors chat with the AI front office. It answers from your knowledge base, captures leads, checks calendar availability, books appointments, and escalates to a human when needed.", tags: ["RAG answers", "Tool-calling", "Live calendar"] },
  { step: 4, title: "Convert", description: "Lead scoring, confirmed bookings, automation events, and revenue analytics turn conversations into measurable business outcomes.", tags: ["Lead scoring", "Bookings", "n8n webhooks"] },
];

const outcomes = [
  {
    icon: DollarSign,
    label: "Revenue Recovered",
    value: "$12,750",
    subtitle: "17 bookings × $750 avg job value",
    color: "text-signal-500",
    variant: "neutral",
    note: "Illustrative",
  },
  {
    icon: Target,
    label: "Conversion Rate",
    value: "29.3%",
    subtitle: "58 leads → 17 booked in 30 days",
    color: "text-relay-500",
    variant: "live",
    note: "Illustrative",
  },
  {
    icon: Timer,
    label: "Avg Response Time",
    value: "3s",
    subtitle: "Visitor → AI reply",
    color: "text-signal-500",
    variant: "neutral",
    note: "Illustrative",
  },
];

const automationEvents = [
  { name: "lead.qualified", description: "Contact captured", color: "text-signal-500", icon: Zap },
  { name: "lead.escalated", description: "Human handoff", color: "text-alert-500", icon: AlertTriangle },
  { name: "booking.created", description: "Appointment booked", color: "text-relay-500", icon: Calendar },
];

const techStack = [
  "Next.js 14",
  "React 18",
  "TypeScript",
  "Supabase",
  "PostgreSQL + pgvector",
  "Google Gemini",
  "Google Calendar API",
  "n8n Community Edition",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-ink-950 text-paper-50">
      {/* ---------- 1. HERO ---------- */}
      <section className="mx-auto flex max-w-6xl flex-col items-start px-6 pt-16 pb-12 sm:pt-20 sm:pb-16">
        <div className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-paper-50/80">
          <span className="signal-dot signal-dot--live" />
          relay status: answering leads in real time
        </div>

        <h1 className="max-w-3xl font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl">
          Never let a lead <span className="text-signal-500">go cold.</span>
        </h1>

        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-paper-50/80">
          RelayOS is an AI front office for service businesses — it answers every
          inbound message in seconds, qualifies the lead against your own
          knowledge base, and books the ones who are ready. No more hours-long
          reply times losing you the job.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link href="/login">
            <Button variant="signal" className="h-10 px-4 text-sm">
              Open the dashboard
            </Button>
          </Link>
          <Link href="/widget/demo-widget-key" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-white/15 bg-white/[0.02] text-sm font-medium text-paper-50 hover:bg-white/5 transition-colors" aria-label="Try the live RelayOS widget demo">
            <Terminal className="h-4 w-4" aria-hidden="true" />
            Try the live widget
          </Link>
        </div>
      </section>

      {/* ---------- 2. PRODUCT DEMO: See RelayOS in Action ---------- */}
      <section className="border-t border-ink-800/10 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeader
            eyebrow="See RelayOS in action"
            title="Real product. Real results."
            description="Three core workflows that show how RelayOS turns conversations into booked jobs."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {productDemos.map((demo, index) => (
              <ScrollReveal key={demo.title} className="reveal-delay-100" threshold={0.15}>
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-signal-500/10 text-signal-500" aria-hidden="true">
                      <demo.icon className="h-5 w-5" />
                    </span>
                    <span className="text-xs font-mono text-paper-50/60 uppercase tracking-wider">LIVE DEMO</span>
                  </div>

                  <h3 className="font-display text-base font-semibold text-ink-950">{demo.title}</h3>
                  <p className="mt-2 text-sm text-paper-50/80 leading-relaxed">{demo.description}</p>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-ink-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink-950 text-white font-mono text-xs">
                          <demo.icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="font-medium">RelayOS</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-paper-50/60 flex-shrink-0" aria-hidden="true" />
                      <div className="flex items-center gap-2 text-ink-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal-500/10 text-signal-500">
                          <Zap className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="font-medium font-mono text-xs">n8n webhook</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-paper-50/60 flex-shrink-0" aria-hidden="true" />
                      <div className="flex items-center gap-2 text-ink-900">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-relay-500/10 text-relay-500">
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <span className="font-medium">Your workflow</span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-paper-50/50">
                      {demo.event.split(' ')[0]}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant={demo.variant as "live" | "neutral" | "thinking" | "escalated"}>{demo.event}</Badge>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal className="reveal-delay-400 mt-10 text-center" threshold={0.15}>
            <Link href="/widget/demo-widget-key" className="inline-flex items-center gap-2 text-sm font-medium text-signal-500 hover:text-signal-400 transition-colors">
              Try the live booking demo
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- 3. CORE CAPABILITIES: Why RelayOS ---------- */}
      <section className="border-t border-ink-800/10 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeader
            eyebrow="Core Capabilities"
            title="Four capabilities that make the difference."
            description="RelayOS isn't a generic chatbot. It's a front office that answers, acts, and measures."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {capabilities.map((cap, index) => (
              <ScrollReveal key={cap.title} className="reveal-delay-100" threshold={0.15}>
                <Card>
                  <div className="mb-4 inline-flex items-center justify-center h-10 w-10 rounded-xl bg-ink-950">
                    <cap.icon className={`h-5 w-5 ${cap.color}`} aria-hidden="true" />
                  </div>
                  <h3 className="font-display text-sm font-semibold text-ink-950">{cap.title}</h3>
                  <p className="mt-2 text-sm text-paper-50/80 leading-relaxed">{cap.description}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cap.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">{tag}</Badge>
                    ))}
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. HOW IT WORKS: The Complete Journey ---------- */}
      <section className="border-t border-ink-800/10 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <SectionHeader
            eyebrow="How RelayOS Works"
            title="From embed to outcome in four steps."
            description="One script embed. Four steps. Measurable outcomes."
          />

          <div className="mt-12 relative">
            <div className="hidden lg:block absolute left-1/2 top-10 bottom-10 w-px -translate-x-1/2 bg-gradient-to-b from-signal-500/30 via-signal-500/10 to-transparent" aria-hidden="true" />

            <div className="relative flex flex-col lg:flex-row items-center gap-8">
              {howItWorks.map((step, index) => (
                <ScrollReveal key={step.title} className={`reveal-delay-${(index + 1) * 100} flex-1`} threshold={0.15}>
                  <div className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                    <div className="relative z-10 mb-4 inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-ink-950 text-ink-600 lg:w-12 lg:h-12">
                      <span className="font-mono text-base font-semibold lg:text-lg">{step.step}</span>
                    </div>
                    <div className="relative z-10 lg:absolute lg:left-0 lg:w-full lg:pr-8 lg:text-right">
                      <h3 className="font-display text-base font-semibold text-ink-950">{step.title}</h3>
                      <p className="mt-2 text-sm text-ink-700/60 leading-relaxed">{step.description}</p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-end">
                        {step.tags.map((tag) => (
                          <Badge key={tag} variant="neutral">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 5. COMPACT OUTCOMES / PROOF ---------- */}
      <section className="border-t border-ink-800/10 bg-ink-900/50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <SectionHeader
            eyebrow="Outcomes & Proof"
            title="Measurable results. Verified infrastructure."
            description="RelayOS turns conversations into measurable business outcomes and connects those outcomes to your workflows."
          />

          <div className="mt-8">
            {/* Metric Cards */}
            <ScrollReveal className="reveal-delay-100" threshold={0.15}>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {outcomes.map((outcome) => (
                  <Card key={outcome.label}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-paper-50/80">{outcome.label}</p>
                      <span className="text-xs font-mono text-paper-50/50 uppercase tracking-wider">{outcome.note}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className={`font-display text-2xl font-semibold ${outcome.color}`}>{outcome.value}</p>
                    </div>
                    <p className="mt-1 text-xs text-paper-50/80">{outcome.subtitle}</p>
                  </Card>
                ))}
              </div>
            </ScrollReveal>

            {/* Automation Events */}
            <ScrollReveal className="reveal-delay-200 mt-8" threshold={0.15}>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {automationEvents.map((event) => (
                  <span key={event.name} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-ink-800/10 bg-white/5 text-xs font-medium text-paper-50/70">
                    <event.icon className={`h-3.5 w-3.5 ${event.color}`} aria-hidden="true" />
                    <span className="font-mono">{event.name}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-paper-50/80 text-center">
                Each event can be routed to its own n8n webhook in Settings.
              </p>
            </ScrollReveal>

            {/* Tech / Trust */}
            <ScrollReveal className="reveal-delay-300 mt-8" threshold={0.15}>
              <p className="text-xs font-mono text-paper-50/50 text-center">
                Next.js · Supabase · Gemini · Google Calendar · n8n
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ---------- 6. FINAL CTA ---------- */}
      <section className="relative border-t border-ink-800/10 bg-ink-950 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-signal-500/5 via-transparent to-relay-500/5" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-signal-500/10 via-transparent to-transparent" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl px-6 py-16 sm:px-8 sm:py-20 lg:py-28 text-center">
          <ScrollReveal className="reveal-delay-100" threshold={0.15}>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-xs text-paper-50/80 mb-6">
              <span className="signal-dot signal-dot--live" aria-hidden="true" />
              Ready to stop losing leads?
            </div>
            <h2 className="font-display text-xl font-semibold leading-[1.1] tracking-tight text-white sm:text-2xl lg:text-3xl">
              Turn more conversations into qualified leads and booked jobs.
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base leading-relaxed text-paper-50/80">
              Start free. Connect your knowledge base. Watch RelayOS answer, qualify, and book — while you focus on the work.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup">
                <Button variant="signal" size="lg" className="h-10 px-4 w-full sm:w-auto">
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  Start free
                </Button>
              </Link>
              <Link href="/widget/demo-widget-key" className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-white/15 bg-white/[0.02] text-sm font-medium text-paper-50/80 hover:text-paper-50 transition-colors">
                <Terminal className="h-4 w-4" aria-hidden="true" />
                Try the live widget
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal className="reveal-delay-200 mt-6" threshold={0.15}>
            <p className="text-xs font-mono text-paper-50/80">
              Deploy on services with free tiers: Vercel, Supabase, Gemini API, Google Calendar API.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className="border-t border-ink-800/10 bg-ink-950">
        <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16 lg:py-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="font-display text-xl font-semibold text-white" aria-label="RelayOS home">
                RelayOS
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-paper-50/80">
                The autonomous AI front office for service businesses. Answers instantly,
                qualifies leads, books appointments, and connects to your workflow.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <Link href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-paper-50/60 hover:text-paper-50 transition-colors" aria-label="Deployed on Vercel">Vercel</Link>
                <Link href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-paper-50/60 hover:text-paper-50 transition-colors" aria-label="Powered by Supabase">Supabase</Link>
                <Link href="https://ai.google.dev/gemini-api" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-paper-50/60 hover:text-paper-50 transition-colors" aria-label="Google Gemini">Google Gemini</Link>
                <Link href="https://n8n.io" target="_blank" rel="noopener noreferrer" className="text-xs font-mono text-paper-50/60 hover:text-paper-50 transition-colors" aria-label="n8n Community Edition">n8n</Link>
              </div>
            </div>

            {/* Product */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white">Product</h3>
              <nav className="mt-4 space-y-3" aria-label="Product navigation">
                <Link href="/widget/demo-widget-key" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Live Widget Demo</Link>
                <Link href="/login" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Dashboard Overview</Link>
                <Link href="/analytics" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Analytics & Revenue</Link>
                <Link href="/settings" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Settings & Automations</Link>
                <Link href="/knowledge-base" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Knowledge Base</Link>
              </nav>
            </div>

            {/* Resources */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white">Resources</h3>
              <nav className="mt-4 space-y-3" aria-label="Resources navigation">
                <Link href="/signup" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Get Started Free</Link>
                <a href="https://github.com/MuhammadBilal561/RelayOS" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">GitHub Repository</a>
                <a href="https://n8n.io/workflows" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">n8n Workflow Templates</a>
                <a href="https://github.com/MuhammadBilal561/RelayOS/blob/main/README.md" target="_blank" rel="noopener noreferrer" className="block text-sm text-paper-50/80 hover:text-paper-50 transition-colors">Documentation</a>
              </nav>
            </div>

            {/* Meta */}
            <div>
              <h3 className="font-display text-sm font-semibold text-white">Meta</h3>
              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-xs text-paper-50/60">&copy; {new Date().getFullYear()} RelayOS. All rights reserved.</p>
                <p className="mt-1 text-xs text-paper-50/60">Built with Next.js, TypeScript, and open-source tools.</p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-paper-50/60">RelayOS is not affiliated with Google, Vercel, Supabase, or n8n.</p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/MuhammadBilal561/RelayOS" target="_blank" rel="noopener noreferrer" className="text-paper-50/60 hover:text-paper-50 transition-colors" aria-label="GitHub">
                  <span className="sr-only">GitHub</span>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" /></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}