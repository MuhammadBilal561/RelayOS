import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/dashboard/section-header";

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
      <SectionHeader eyebrow="Inbox" title="Conversations" />

      <div className="mt-6">
        <div className="overflow-x-auto -mx-6 sm:mx-0 px-6 sm:px-0" role="region" aria-label="Conversations table" tabIndex={0}>
          <table className="w-full min-w-[600px]" role="table">
            <thead>
              <tr className="border-b border-ink-800/10">
                <th className="sticky left-0 z-10 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50 bg-ink-950/50" scope="col">Conversation</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50" scope="col">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-ink-700/50" scope="col">Date</th>
                <th className="w-1" scope="col"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800/10">
              {(!conversations || conversations.length === 0) && (
                <tr>
                  <td className="px-5 py-10 text-center text-sm text-ink-700/60" colSpan={4}>
                    No conversations yet — open the widget (see Settings for your embed link) and send a message to see it show up here in real time.
                  </td>
                </tr>
              )}
              {conversations?.map((c) => {
                const lead = c.leads;
                return (
                  <tr key={c.id} className="hover:bg-paper-50">
                    <td className="sticky left-0 z-10 px-5 py-4 bg-white bg-opacity-95 backdrop-blur-sm">
                      <Link href={`/inbox/${c.id}`} className="block">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {lead?.name || lead?.email || "Anonymous visitor"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-700/60">
                          {c.summary_text ?? "No summary yet"}
                        </p>
                      </Link>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant={statusVariant[c.status as keyof typeof statusVariant] ?? "neutral"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-ink-700/40">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="w-1"></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-center text-ink-700/40 md:hidden">← Swipe to scroll →</p>
      </div>
    </div>
  );
}
