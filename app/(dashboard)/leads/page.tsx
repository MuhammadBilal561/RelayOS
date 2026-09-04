import Link from "next/link";
import { Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { LeadStatus } from "@/types/database";
import { SectionHeader } from "@/components/dashboard/section-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const columns: { status: LeadStatus; label: string; hint: string }[] = [
  { status: "new", label: "New", hint: "Just arrived" },
  { status: "qualified", label: "Qualified", hint: "Ready to book" },
  { status: "booked", label: "Booked", hint: "On the calendar" },
  { status: "escalated", label: "Escalated", hint: "Needs a human" },
  { status: "nurturing", label: "Nurturing", hint: "Follow-up" },
  { status: "lost", label: "Lost", hint: "Closed out" },
];

function scoreVariant(score: number) {
  if (score >= 70) return "success" as const;
  if (score >= 40) return "warning" as const;
  return "neutral" as const;
}

const scoreBar = {
  success: "bg-relay-500",
  warning: "bg-signal-500",
  neutral: "bg-ink-300",
};

const columnTone: Record<LeadStatus, string> = {
  new: "bg-ink-950 text-white",
  qualified: "bg-[#e8f7ee] text-ink-950",
  booked: "bg-signal-500 text-ink-950",
  escalated: "bg-[#fdecec] text-ink-950",
  nurturing: "bg-[#fffdf8] text-ink-950",
  lost: "bg-[#f3eee4] text-ink-700",
};

export default async function LeadsPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, name, email, phone, service_interest, status, score, created_at")
    .eq("business_id", business.id)
    .order("score", { ascending: false });
  if (leadsError) throw new Error(`Failed to load leads: ${leadsError.message}`);

  const leadIds = (leads ?? []).map((l) => l.id);
  const { data: conversationRows, error: conversationError } = leadIds.length
    ? await supabase
        .from("conversations")
        .select("id, lead_id, created_at")
        .eq("business_id", business.id)
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
    : { data: [], error: null };
  if (conversationError) throw new Error(`Failed to load lead conversations: ${conversationError.message}`);

  const latestConversationByLead = new Map<string, string>();
  for (const c of conversationRows ?? []) {
    if (!latestConversationByLead.has(c.lead_id)) latestConversationByLead.set(c.lead_id, c.id);
  }

  const hasAnyLeads = (leads ?? []).length > 0;

  return (
    <PageShell width="wide">
      <SectionHeader
        eyebrow="Leads"
        title="Pipeline"
        description="Ranked by lead score — a deterministic blend of contact info captured, urgency language detected, and engagement depth. Recalculated after every message."
        actions={hasAnyLeads ? <Badge variant="neutral">{leads?.length} leads</Badge> : undefined}
      />

      <div className="mt-7">
        {!hasAnyLeads ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Leads appear here the moment a visitor shares contact info through your widget. Open the live preview and say hello to see the pipeline fill up."
            action={
              <Link href="/widget/demo-widget-key" target="_blank" className="text-sm font-medium text-signal-700 hover:text-signal-600">
                Try the live widget
              </Link>
            }
          />
        ) : (
          <div
            className="overflow-x-auto pb-4 scroll-thin"
            role="region"
            aria-label="Leads pipeline"
            tabIndex={0}
          >
            <div className="grid min-w-max grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {columns.map((col) => {
                const columnLeads = (leads ?? []).filter((l) => l.status === col.status);
                return (
                  <div key={col.status} className="w-[232px]">
                    <div className={cn("mb-3 rounded-2xl px-3.5 py-3", columnTone[col.status])}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-semibold">{col.label}</p>
                        <span className="rounded-full bg-black/10 px-2 py-0.5 font-mono text-[10px]">
                          {columnLeads.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] opacity-65">{col.hint}</p>
                    </div>

                    <div className="space-y-2">
                      {columnLeads.map((lead) => {
                        const conversationId = latestConversationByLead.get(lead.id);
                        const tone = scoreVariant(lead.score);
                        const card = (
                          <div className="group rounded-2xl border border-ink-900/8 bg-[#fffdf8] p-3.5 shadow-[0_14px_30px_-22px_rgba(55,40,18,0.4)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-20px_rgba(55,40,18,0.5)]">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate font-display text-sm font-semibold text-ink-950">
                                {lead.name || lead.email || "Anonymous visitor"}
                              </p>
                              <Badge variant={tone} className="shrink-0">
                                {lead.score}
                              </Badge>
                            </div>
                            {lead.service_interest && (
                              <p className="mt-1 truncate text-xs text-ink-500">{lead.service_interest}</p>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#efe8dc]" aria-hidden="true">
                                <div
                                  className={cn("h-full rounded-full", scoreBar[tone])}
                                  style={{ width: `${Math.min(100, lead.score)}%` }}
                                />
                              </div>
                            </div>

                            <p className="mt-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                              {formatDate(lead.created_at)}
                            </p>
                          </div>
                        );
                        return conversationId ? (
                          <Link
                            key={lead.id}
                            href={`/inbox/${conversationId}`}
                            className="block"
                            aria-label={`Open conversation with ${lead.name || lead.email || "this lead"}`}
                          >
                            {card}
                          </Link>
                        ) : (
                          <div key={lead.id}>{card}</div>
                        );
                      })}
                    </div>

                    {columnLeads.length === 0 && (
                      <EmptyState compact title="No leads here yet" description="New leads land in this stage when they qualify." />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
