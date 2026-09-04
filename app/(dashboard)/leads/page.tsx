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

const columns: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "qualified", label: "Qualified" },
  { status: "booked", label: "Booked" },
  { status: "escalated", label: "Escalated" },
  { status: "nurturing", label: "Nurturing" },
  { status: "lost", label: "Lost" },
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

const columnAccent: Record<LeadStatus, string> = {
  new: "bg-ink-400",
  qualified: "bg-signal-500",
  booked: "bg-relay-500",
  escalated: "bg-alert-500",
  nurturing: "bg-ink-300",
  lost: "bg-ink-300",
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
        description="Ranked by lead score — a deterministic blend of contact info captured, urgency language detected, and engagement depth. Recalculated after every message, not an LLM self-report."
      />

      <div className="mt-6">
        {!hasAnyLeads ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            description="Leads appear here the moment a visitor shares contact info through your widget. Open the live preview and say hello to see the pipeline fill up."
            action={
              <Link href="/widget/demo-widget-key" target="_blank" className="text-sm font-medium text-signal-600 hover:text-signal-700">
                Try the live widget →
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
                  <div key={col.status} className="w-[220px]">
                    <div className="mb-2.5 flex items-center justify-between px-1">
                      <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                        <span className={cn("h-1.5 w-1.5 rounded-full", columnAccent[col.status])} aria-hidden="true" />
                        {col.label}
                      </p>
                      <span className="rounded-full bg-ink-900/[0.06] px-2 py-0.5 font-mono text-[10px] text-ink-500">
                        {columnLeads.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {columnLeads.map((lead) => {
                        const conversationId = latestConversationByLead.get(lead.id);
                        const tone = scoreVariant(lead.score);
                        const card = (
                          <div className="group rounded-xl border border-ink-900/[0.07] bg-white p-3 shadow-panel transition-all duration-150 hover:-translate-y-0.5 hover:border-ink-900/[0.12] hover:shadow-panel-hover">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate text-sm font-medium text-ink-900">
                                {lead.name || lead.email || "Anonymous visitor"}
                              </p>
                              <Badge variant={tone} className="shrink-0">
                                {lead.score}
                              </Badge>
                            </div>
                            {lead.service_interest && (
                              <p className="mt-1 truncate text-xs text-ink-400">{lead.service_interest}</p>
                            )}

                            <div className="mt-2.5 flex items-center gap-2">
                              <div className="h-1 w-full overflow-hidden rounded-full bg-paper-100" aria-hidden="true">
                                <div
                                  className={cn("h-full rounded-full", scoreBar[tone])}
                                  style={{ width: `${Math.min(100, lead.score)}%` }}
                                />
                              </div>
                              <span className="shrink-0 font-mono text-[9px] uppercase tracking-wide text-ink-300">
                                score
                              </span>
                            </div>

                            <p className="mt-2 font-mono text-[10px] text-ink-300">{formatDate(lead.created_at)}</p>
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
