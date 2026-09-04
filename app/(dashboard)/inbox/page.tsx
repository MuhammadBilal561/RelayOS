import Link from "next/link";
import { MessageSquare, ArrowRight, ExternalLink } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/dashboard/section-header";
import { PageShell } from "@/components/dashboard/page-shell";
import { formatRelativeTime } from "@/lib/format";

const statusVariant = {
  open: "live",
  escalated: "escalated",
  closed: "neutral",
} as const;

const statusTone = {
  open: "live",
  escalated: "escalated",
  closed: "idle",
} as const;

export default async function InboxPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  const { data: conversationRows, error: conversationError } = await supabase
    .from("conversations")
    .select("id, status, created_at, summary_text, lead_id")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (conversationError) throw new Error(`Failed to load conversations: ${conversationError.message}`);

  const leadIds = [...new Set((conversationRows ?? []).map((c) => c.lead_id))];
  const { data: leadRows, error: leadError } = leadIds.length
    ? await supabase
        .from("leads")
        .select("id, name, email, score")
        .eq("business_id", business.id)
        .in("id", leadIds)
    : { data: [], error: null };
  if (leadError) throw new Error(`Failed to load conversation contacts: ${leadError.message}`);

  const leadsById = new Map((leadRows ?? []).map((l) => [l.id, l]));
  const conversations = (conversationRows ?? []).map((c) => ({ ...c, leads: leadsById.get(c.lead_id) ?? null }));

  const headerActions =
    conversations.length > 0 ? (
      <Badge variant="neutral">{conversations.length} total</Badge>
    ) : undefined;

  return (
    <PageShell>
      <SectionHeader
        eyebrow="Inbox"
        title="Conversations"
        description="Every widget conversation, in one place — with the lead, its status, and an AI summary of what was discussed."
        actions={headerActions}
      />

      <div className="mt-7">
        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="When a visitor sends a message through your widget, it appears here in real time. To try it, open the live widget preview or drop the embed code onto any page."
            action={
              <Link href="/settings#widget" className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-700 hover:text-signal-600">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Get the embed code
              </Link>
            }
          />
        ) : (
          <ul className="space-y-3">
            {conversations.map((c) => {
              const lead = c.leads;
              const statusKey = c.status as keyof typeof statusVariant;
              return (
                <li key={c.id}>
                  <Link
                    href={`/inbox/${c.id}`}
                    className="group surface flex items-start gap-4 p-4 transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-panel-hover"
                  >
                    <Avatar name={lead?.name ?? lead?.email} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-display text-[15px] font-semibold text-ink-950">
                          {lead?.name || lead?.email || "Anonymous visitor"}
                        </span>
                        {typeof lead?.score === "number" && lead.score >= 70 && (
                          <Badge variant="success">{lead.score}</Badge>
                        )}
                        <Badge variant={statusVariant[statusKey] ?? "neutral"} dot dotTone={statusTone[statusKey] ?? "idle"}>
                          {c.status}
                        </Badge>
                      </span>
                      <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-ink-500">
                        {c.summary_text ?? "No summary yet — open to view the transcript."}
                      </span>
                      <span className="mt-2 block text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        {formatRelativeTime(c.created_at)}
                      </span>
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ink-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-ink-950" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
