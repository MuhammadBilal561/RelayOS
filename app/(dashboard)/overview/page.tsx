import Link from "next/link";
import {
  MessageSquare,
  Users,
  CheckCircle2,
  Gauge,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  LineChart,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PageShell } from "@/components/dashboard/page-shell";

async function getKpis(businessId: string) {
  const supabase = createServerSupabaseClient();

  const results = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "qualified"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "escalated"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "booked"),
    supabase.from("leads").select("score").eq("business_id", businessId),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Failed to load dashboard metrics: ${failed.error.message}`);

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: escalated },
    { count: conversations },
    { count: bookedLeads },
    { data: scoreRows },
  ] = results;

  const scores = (scoreRows ?? []).map((r) => r.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    totalLeads: totalLeads ?? 0,
    qualifiedLeads: qualifiedLeads ?? 0,
    escalated: escalated ?? 0,
    conversations: conversations ?? 0,
    bookedLeads: bookedLeads ?? 0,
    avgScore,
  };
}

const quickActions = [
  {
    href: "/knowledge-base",
    icon: BookOpen,
    step: "01",
    title: "Teach the AI",
    description: "Add pricing and policies to ground every answer.",
  },
  {
    href: "/settings#calendar",
    icon: CalendarDays,
    step: "02",
    title: "Connect your calendar",
    description: "Let the widget check availability and book.",
  },
  {
    href: "/analytics",
    icon: LineChart,
    step: "03",
    title: "See revenue recovered",
    description: "Live funnel, response time, and conversion.",
  },
];

export default async function OverviewPage() {
  const business = await getCurrentBusiness();
  const kpis = await getKpis(business.id);

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Overview"
        title={business.name}
        description="A live snapshot of conversations, pipeline health, and what to set up next."
        actions={
          <Badge variant="live" dot dotTone="live">
            widget live
          </Badge>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Conversations" value={kpis.conversations} icon={MessageSquare} tone="signal" />
        <KpiCard label="Total leads" value={kpis.totalLeads} icon={Users} />
        <KpiCard
          label="Qualified"
          value={kpis.qualifiedLeads}
          icon={CheckCircle2}
          tone="relay"
          hint={`${kpis.bookedLeads} booked`}
        />
        <KpiCard label="Avg lead score" value={kpis.avgScore} icon={Gauge} />
        <KpiCard label="Escalated" value={kpis.escalated} icon={AlertTriangle} tone="alert" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-ink-950 p-6 text-white shadow-[0_24px_50px_-28px_rgba(17,27,35,0.7)] sm:p-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Analytics</p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Revenue recovery</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
            Response-time trends, the conversion funnel, and the revenue recovered number live on the Analytics page.
          </p>
          <Link
            href="/analytics"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-signal-500 px-4 py-2.5 text-sm font-semibold text-ink-950 transition-colors hover:bg-signal-400"
          >
            Open analytics
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="surface p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-ink-950">Set up in minutes</h2>
            <p className="mt-1 text-sm text-ink-500">Three steps to a live front office.</p>
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-3 rounded-xl border border-ink-900/6 bg-[#faf6ef] px-3 py-3 transition-colors hover:border-ink-900/12 hover:bg-white"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-950 text-signal-400">
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-ink-400">{action.step}</span>
                    <span className="text-sm font-semibold text-ink-900">{action.title}</span>
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{action.description}</span>
                </span>
              </Link>
            ))}
          </div>
          <Link
            href={`/widget/${business.public_widget_key}`}
            target="_blank"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Open live widget preview
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
