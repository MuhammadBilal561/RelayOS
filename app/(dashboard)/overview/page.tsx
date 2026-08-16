import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getKpis(businessId: string) {
  const supabase = createServerSupabaseClient();

  const [
    { count: totalLeads },
    { count: qualifiedLeads },
    { count: escalated },
    { count: conversations },
    { data: scoreRows },
  ] = await Promise.all([
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
    supabase.from("leads").select("score").eq("business_id", businessId),
  ]);

  const scores = (scoreRows ?? []).map((r) => r.score);
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  return {
    totalLeads: totalLeads ?? 0,
    qualifiedLeads: qualifiedLeads ?? 0,
    escalated: escalated ?? 0,
    conversations: conversations ?? 0,
    avgScore,
  };
}

export default async function OverviewPage() {
  const business = await getCurrentBusiness();
  const kpis = await getKpis(business.id);

  const cards = [
    { label: "Conversations", value: kpis.conversations },
    { label: "Total leads", value: kpis.totalLeads },
    { label: "Qualified", value: kpis.qualifiedLeads },
    { label: "Avg lead score", value: kpis.avgScore },
    { label: "Escalated to a human", value: kpis.escalated },
  ];

  return (
    <div className="p-6 sm:p-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/40">Overview</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">{business.name}</h1>
        </div>
        <Badge variant="live">
          <span className="signal-dot signal-dot--live" /> widget live
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent>
              <p className="text-xs text-ink-700/60">{card.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent>
          <p className="text-sm font-medium text-ink-900">Revenue-recovery analytics</p>
          <p className="mt-1.5 text-sm text-ink-700/60">
            Response-time trends, the conversion funnel, and the "revenue recovered" number live on the{" "}
            <a href="/analytics" className="text-signal-600 underline underline-offset-4">
              Analytics
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
