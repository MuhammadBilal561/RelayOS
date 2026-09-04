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

      <div className="mt-6">
        {conversations.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="When a visitor sends a message through your widget, it appears here in real time. To try it, open the live widget preview or drop the embed code onto any page."
            action={
              <Link href="/settings#widget" className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-600 hover:text-signal-700">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                Get the embed code
              </Link>
            }
          />
        ) : (
          <>
            <div className="surface hidden overflow-hidden md:block">
              <div className="overflow-x-auto scroll-thin" role="region" aria-label="Conversations table" tabIndex={0}>
                <table className="dash-table w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-ink-900/[0.07]">
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Conversation
                      </th>
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Status
                      </th>
                      <th scope="col" className="px-5 py-3 text-[11px] font-medium uppercase tracking-wide text-ink-400">
                        Last activity
                      </th>
                      <th scope="col" className="w-8 px-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-900/[0.05]">
                    {conversations.map((c) => {
                      const lead = c.leads;
                      const statusKey = c.status as keyof typeof statusVariant;
                      return (
                        <tr key={c.id} className="group">
                          <td className="px-5 py-3.5">
                            <Link href={`/inbox/${c.id}`} className="flex items-center gap-3">
                              <Avatar name={lead?.name ?? lead?.email} />
                              <span className="min-w-0">
                                <span className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-ink-900">
                                    {lead?.name || lead?.email || "Anonymous visitor"}
                                  </span>
                                  {typeof lead?.score === "number" && lead.score >= 70 && (
                                    <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                                      {lead.score}
                                    </Badge>
                                  )}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-ink-400">
                                  {c.summary_text ?? "No summary yet — open to view the transcript."}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={statusVariant[statusKey] ?? "neutral"} dot dotTone={statusTone[statusKey] ?? "idle"}>
                              {c.status}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-ink-400">
                            {formatRelativeTime(c.created_at)}
                          </td>
                          <td className="px-3">
                            <ArrowRight className="h-4 w-4 text-ink-300 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-signal-600" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <ul className="space-y-2 md:hidden">
              {conversations.map((c) => {
                const lead = c.leads;
                const statusKey = c.status as keyof typeof statusVariant;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/inbox/${c.id}`}
                      className="surface flex items-center gap-3 p-3.5 transition-colors duration-150 active:bg-paper-50"
                    >
                      <Avatar name={lead?.name ?? lead?.email} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink-900">
                            {lead?.name || lead?.email || "Anonymous visitor"}
                          </span>
                          <span className="shrink-0 font-mono text-[11px] text-ink-400">
                            {formatRelativeTime(c.created_at)}
                          </span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-ink-400">
                          {c.summary_text ?? "No summary yet."}
                        </span>
                        <span className="mt-2 inline-block">
                          <Badge variant={statusVariant[statusKey] ?? "neutral"} dot dotTone={statusTone[statusKey] ?? "idle"}>
                            {c.status}
                          </Badge>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </PageShell>
  );
}
