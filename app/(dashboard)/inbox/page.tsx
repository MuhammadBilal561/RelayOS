import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";

const statusVariant = {
  open: "live",
  escalated: "escalated",
  closed: "neutral",
} as const;

export default async function InboxPage() {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  // Two plain queries instead of a PostgREST embedded-relation select —
  // see the note in inbox/[conversationId]/page.tsx for why.
  const { data: conversationRows } = await supabase
    .from("conversations")
    .select("id, status, created_at, summary_text, lead_id")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const leadIds = [...new Set((conversationRows ?? []).map((c) => c.lead_id))];
  const { data: leadRows } = leadIds.length
    ? await supabase.from("leads").select("id, name, email, status").in("id", leadIds)
    : { data: [] };

  const leadsById = new Map((leadRows ?? []).map((l) => [l.id, l]));
  const conversations = (conversationRows ?? []).map((c) => ({ ...c, leads: leadsById.get(c.lead_id) ?? null }));

  return (
    <div className="p-6 sm:p-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-700/40">Inbox</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink-950">Conversations</h1>

      <div className="mt-6 divide-y divide-ink-800/10 rounded-xl border border-ink-800/10 bg-white shadow-panel">
        {(!conversations || conversations.length === 0) && (
          <p className="p-6 text-sm text-ink-700/60">
            No conversations yet — open the widget (see Settings for your embed link) and send a message to see
            it show up here in real time.
          </p>
        )}

        {conversations?.map((c) => {
          const lead = c.leads;
          return (
            <Link
              key={c.id}
              href={`/inbox/${c.id}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">
                  {lead?.name || lead?.email || "Anonymous visitor"}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-700/60">
                  {c.summary_text ?? "No summary yet"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge variant={statusVariant[c.status as keyof typeof statusVariant] ?? "neutral"}>
                  {c.status}
                </Badge>
                <span className="font-mono text-xs text-ink-700/40">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
