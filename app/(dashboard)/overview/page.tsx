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
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { KpiCard } from "@/components/dashboard/kpi-card";

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
    title: "Teach the AI",
    description: "Add pricing and policies to ground every answer.",
  },
  {
    href: "/settings#calendar",
    icon: CalendarDays,
    title: "Connect your calendar",
    description: "Let the widget check availability and book.",
  },
  {
    href: "/analytics",
    icon: LineChart,
    title: "See revenue recovered",
    description: "Live funnel, response time, and conversion.",
  },
];

export default async function OverviewPage() {
  const business = await getCurrentBusiness();
  const kpis = await getKpis(business.id);

  return (
    <div className="mx-auto w-full max-w-6xl p-6 sm:p-8">
      <SectionHeader
        eyebrow="Overview"
        title={business.name}
        actions={
          <Badge variant="live" dot dotTone="live">
            widget live
          </Badge>
        }
      />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard label="Conversations" value={kpis.conversations} icon={MessageSquare} />
        <KpiCard label="Total leads" value={kpis.totalLeads} icon={Users} />
        <KpiCard
          label="Qualified"
          value={kpis.qualifiedLeads}
          icon={CheckCircle2}
          tone="relay"
          hint={`${kpis.bookedLeads} booked`}
        />
        <KpiCard label="Avg lead score" value={kpis.avgScore} icon={Gauge} tone="signal" />
        <KpiCard label="Escalated" value={kpis.escalated} icon={AlertTriangle} tone="alert" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Revenue-recovery analytics</CardTitle>
              <CardDescription>
                Response-time trends, the conversion funnel, and the revenue recovered number live on
                the Analytics page.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Link
              href="/analytics"
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-signal-600 transition-colors hover:text-signal-700"
            >
              Open analytics
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Set up in minutes</CardTitle>
              <CardDescription>Three steps to a live front office.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group -mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors duration-150 hover:bg-paper-50"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-900/[0.06] text-ink-500 transition-colors duration-150 group-hover:bg-signal-500/10 group-hover:text-signal-700">
                  <action.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-900">{action.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">
                    {action.description}
                  </span>
                </span>
              </Link>
            ))}
          </CardContent>
          <CardFooter className="justify-start">
            <Link
              href={`/widget/${business.public_widget_key}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 transition-colors hover:text-ink-900"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              Open live widget preview
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
