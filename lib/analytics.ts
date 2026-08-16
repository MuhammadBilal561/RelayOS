import { createServerSupabaseClient } from "@/lib/supabase/server";

// --- Pure calculation functions ---------------------------------------
// Kept separate from data-fetching (same pattern as lib/scoring.ts) so the
// actual arithmetic — the part most likely to have an off-by-one or a
// divide-by-zero bug — can be unit tested without touching Postgres.

/**
 * "Revenue recovered" only means something once an owner tells us what an
 * average booking is worth — showing $0 or a guessed number would be a
 * fabricated metric on the exact headline number this product is supposed
 * to prove out. Returns null (render as "—, set a value") until then.
 */
export function computeRevenueRecovered(bookingsCount: number, avgJobValue: number | null): number | null {
  if (avgJobValue == null || avgJobValue <= 0) return null;
  return Math.round(bookingsCount * avgJobValue * 100) / 100;
}

/** Average seconds between a visitor's message and the AI's reply, across a set of conversations. */
export function computeAvgResponseSeconds(pairs: { visitorAt: string; assistantAt: string }[]): number | null {
  if (pairs.length === 0) return null;
  const totalMs = pairs.reduce(
    (sum, p) => sum + Math.max(0, new Date(p.assistantAt).getTime() - new Date(p.visitorAt).getTime()),
    0
  );
  return Math.round(totalMs / pairs.length / 1000);
}

/** Percentage (one decimal place) of total leads that reached "booked." Null when there are no leads yet. */
export function computeConversionRate(totalLeads: number, bookedLeads: number): number | null {
  if (totalLeads <= 0) return null;
  return Math.round((bookedLeads / totalLeads) * 1000) / 10;
}

export interface FunnelStage {
  label: string;
  count: number;
}

/**
 * Builds a monotonically-sane funnel for display — pipeline stages don't
 * literally contain each other in our schema (a lead has one status, not a
 * history of every stage it passed through), so this takes the counts as
 * given rather than trying to force lead counts to be strictly decreasing.
 */
export function buildFunnel(counts: { new: number; qualified: number; booked: number }): FunnelStage[] {
  return [
    { label: "New", count: counts.new },
    { label: "Qualified", count: counts.qualified },
    { label: "Booked", count: counts.booked },
  ];
}

// --- Data-fetching orchestrator -----------------------------------------

export interface AnalyticsSummary {
  totalLeads: number;
  qualifiedLeads: number;
  bookedLeads: number;
  escalatedLeads: number;
  avgResponseSeconds: number | null;
  conversionRate: number | null;
  revenueRecovered: number | null;
  funnel: FunnelStage[];
  dailySeries: { date: string; leads: number; bookings: number }[];
}

export async function getAnalyticsSummary(businessId: string, days = 30): Promise<AnalyticsSummary> {
  const supabase = createServerSupabaseClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: leads }, { data: bookings }, { data: business }] = await Promise.all([
    supabase.from("leads").select("id, status, created_at").eq("business_id", businessId).gte("created_at", since),
    supabase
      .from("bookings")
      .select("id, created_at")
      .eq("business_id", businessId)
      .neq("status", "cancelled")
      .gte("created_at", since),
    supabase.from("businesses").select("avg_job_value").eq("id", businessId).single(),
  ]);

  const totalLeads = leads?.length ?? 0;
  const qualifiedLeads = leads?.filter((l) => l.status === "qualified" || l.status === "booked").length ?? 0;
  const bookedLeads = leads?.filter((l) => l.status === "booked").length ?? 0;
  const escalatedLeads = leads?.filter((l) => l.status === "escalated").length ?? 0;
  const bookingsCount = bookings?.length ?? 0;

  // Sample response time across recent conversations for this business —
  // capped at 50 to keep this fast on a live dashboard load.
  const { data: recentConversations } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  const responsePairs: { visitorAt: string; assistantAt: string }[] = [];
  for (const conv of recentConversations ?? []) {
    const { data: messages } = await supabase
      .from("messages")
      .select("role, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(2);
    if (messages && messages.length === 2 && messages[0].role === "visitor" && messages[1].role === "assistant") {
      responsePairs.push({ visitorAt: messages[0].created_at, assistantAt: messages[1].created_at });
    }
  }

  const dailyMap = new Map<string, { leads: number; bookings: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyMap.set(date, { leads: 0, bookings: 0 });
  }
  for (const lead of leads ?? []) {
    const date = lead.created_at.slice(0, 10);
    if (dailyMap.has(date)) dailyMap.get(date)!.leads += 1;
  }
  for (const booking of bookings ?? []) {
    const date = booking.created_at.slice(0, 10);
    if (dailyMap.has(date)) dailyMap.get(date)!.bookings += 1;
  }

  return {
    totalLeads,
    qualifiedLeads,
    bookedLeads,
    escalatedLeads,
    avgResponseSeconds: computeAvgResponseSeconds(responsePairs),
    conversionRate: computeConversionRate(totalLeads, bookedLeads),
    revenueRecovered: computeRevenueRecovered(bookingsCount, business?.avg_job_value ?? null),
    funnel: buildFunnel({
      new: totalLeads - qualifiedLeads,
      qualified: qualifiedLeads - bookedLeads,
      booked: bookedLeads,
    }),
    dailySeries: Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v })),
  };
}
