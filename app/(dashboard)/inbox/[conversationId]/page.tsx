import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { cn } from "@/lib/utils";

export default async function ConversationDetailPage({ params }: { params: { conversationId: string } }) {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  // Two plain queries instead of a PostgREST embedded-relation select —
  // simpler to keep correctly typed with a hand-maintained Database type,
  // and avoids depending on foreign-key Relationships metadata we don't
  // generate automatically in Phase 1.
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, status, lead_id")
    .eq("id", params.conversationId)
    .eq("business_id", business.id)
    .single();

  const { data: lead } = conversation
    ? await supabase
        .from("leads")
        .select("name, email, phone, status, score")
        .eq("id", conversation.lead_id)
        .single()
    : { data: null };

  const { data: messages } = await supabase
    .from("messages")
    .select("id, role, content, created_at, tool_calls")
    .eq("conversation_id", params.conversationId)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10">
      <Link href="/inbox" className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-700/60 hover:text-ink-950">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to inbox
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold text-ink-950">
          {lead?.name || lead?.email || "Anonymous visitor"}
        </h1>
        <p className="mt-1 text-sm text-ink-700/60">
          {lead?.email ?? "No email captured"} · {lead?.phone ?? "No phone captured"} · lead score {lead?.score ?? 0}
        </p>
      </div>

      <div className="space-y-3">
        {messages?.map((m) => (
          <div key={m.id} className={m.role === "visitor" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                m.role === "visitor" && "rounded-br-sm bg-ink-950 text-white",
                m.role === "assistant" && "rounded-bl-sm bg-paper-100 text-ink-900",
                m.role === "staff" && "rounded-bl-sm bg-signal-500/10 text-ink-900"
              )}
            >
              {m.content}
              {m.tool_calls ? (
                <p className="mt-1.5 font-mono text-[10px] text-ink-700/50">
                  ⚙ action taken: {JSON.stringify(m.tool_calls)}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
