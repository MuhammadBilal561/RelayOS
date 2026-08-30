import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import type { LeadStatus } from "@/types/database";
import { SectionHeader } from "@/components/dashboard/section-header";

const columns: { status: LeadStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "qualified", label: "Qualified" },
  { status: "booked", label: "Booked" },
  { status: "escalated", label: "Escalated" },
  { status: "nurturing", label: "Nurturing" },
  { status: "lost", label: "Lost" },
];

function scoreVariant(score: number) {
  if (score >= 70) return "live" as const;
  if (score >= 40) return "thinking" as const;
  return "neutral" as const;
}

export default async function LeadsPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, email, phone, service_interest, status, score, created_at")
    .eq("business_id", business.id)
    .order("score", { ascending: false });

  const leadIds = (leads ?? []).map((l) => l.id);
  const { data: conversationRows } = leadIds.length
    ? await supabase
        .from("conversations")
        .select("id, lead_id, created_at")
        .in("lead_id", leadIds)
        .order("created_at", { ascending: false })
    : { data: [] };

  // First conversation seen per lead (list is already newest-first) is
  // that lead's most recent conversation.
  const latestConversationByLead = new Map<string, string>();
  for (const c of conversationRows ?? []) {
    if (!latestConversationByLead.has(c.lead_id)) latestConversationByLead.set(c.lead_id, c.id);
  }

return (
    <div className="p-6 sm:p-10">
      <SectionHeader
        eyebrow="Leads"
        title="Pipeline"
        description="Ranked by lead score — a deterministic blend of contact info captured, urgency language detected, and engagement depth. Recalculated after every message, not an LLM self-report."
      />

      <div className="mt-6 overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0 pb-4" role="region" aria-label="Leads pipeline" tabIndex={0}>
        <div className="grid grid-cols-1 gap-4 overflow-x-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 min-w-max">
          {columns.map((col) => {
            const columnLeads = (leads ?? []).filter((l) => l.status === col.status);
            return (
              <div key={col.status} className="min-w-[220px]">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-700/50">{col.label}</p>
                  <span className="font-mono text-[11px] text-ink-700/40">{columnLeads.length}</span>
                </div>

                <div className="space-y-2">
                  {columnLeads.map((lead) => {
                    const conversationId = latestConversationByLead.get(lead.id);
                    const card = (
                      <div className="rounded-xl border border-ink-800/10 bg-white p-3 shadow-panel transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {lead.name || lead.email || "Anonymous visitor"}
                          </p>
                          <Badge variant={scoreVariant(lead.score)}>{lead.score}</Badge>
                        </div>
                        {lead.service_interest && (
                          <p className="mt-1 truncate text-xs text-ink-700/60">{lead.service_interest}</p>
                        )}
                        <p className="mt-2 font-mono text-[10px] text-ink-700/40">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    );
                    return conversationId ? (
                      <Link key={lead.id} href={`/inbox/${conversationId}`} className="block">
                        {card}
                      </Link>
                    ) : (
                      <div key={lead.id}>{card}</div>
                    );
                  })}
                </div>

                {columnLeads.length === 0 && (
                  <p className="rounded-xl border border-dashed border-ink-800/15 p-3 text-center text-xs text-ink-700/30">
                    Empty
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-center text-ink-700/40 md:hidden">← Swipe to scroll →</p>
    </div>
  );
}
