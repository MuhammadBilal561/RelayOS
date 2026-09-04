import Link from "next/link";
import { ArrowLeft, Wrench, User } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export default async function ConversationDetailPage({ params }: { params: { conversationId: string } }) {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

  // Two plain queries instead of a PostgREST embedded-relation select —
  // simpler to keep correctly typed with a hand-maintained Database type,
  // and avoids depending on foreign-key Relationships metadata we don't
  // generate automatically in Phase 1.
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, status, lead_id")
    .eq("id", params.conversationId)
    .eq("business_id", business.id)
    .single();
  if (conversationError) throw new Error(`Failed to load conversation: ${conversationError.message}`);

  const { data: lead, error: leadError } = conversation
    ? await supabase
        .from("leads")
        .select("name, email, phone, status, score")
        .eq("id", conversation.lead_id)
        .eq("business_id", business.id)
        .single()
    : { data: null, error: null };
  if (leadError) throw new Error(`Failed to load conversation contact: ${leadError.message}`);

  const { data: messages, error: messagesError } = conversation
    ? await supabase
        .from("messages")
        .select("id, role, content, created_at, tool_calls")
        .eq("conversation_id", params.conversationId)
        .order("created_at", { ascending: true })
    : { data: null, error: null };
  if (messagesError) throw new Error(`Failed to load conversation messages: ${messagesError.message}`);

  const roleLabel: Record<string, string> = {
    visitor: "Visitor",
    assistant: "RelayOS",
    staff: "Team",
    system: "System",
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-6 sm:p-8">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors duration-150 hover:text-ink-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to inbox
      </Link>

      {/* Conversation header */}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={lead?.name ?? lead?.email} size="md" />
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-ink-950">
              {lead?.name || lead?.email || "Anonymous visitor"}
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              {lead?.email ?? "No email captured"}
              {lead?.phone ? ` · ${lead.phone}` : " · No phone captured"}
              {typeof lead?.score === "number" ? ` · score ${lead.score}` : ""}
            </p>
          </div>
        </div>
        <Badge variant={conversation?.status === "escalated" ? "escalated" : conversation?.status === "open" ? "live" : "neutral"} dot>
          {conversation?.status ?? "unknown"}
        </Badge>
      </div>

      <div className="divider mt-6" />

      {/* Transcript */}
      {(!messages || messages.length === 0) ? (
        <div className="mt-8 rounded-xl border border-dashed border-ink-900/15 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm font-medium text-ink-900">No messages</p>
          <p className="mt-1 text-sm text-ink-500">The transcript for this conversation is empty.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {messages.map((m) => {
            const isVisitor = m.role === "visitor";
            return (
              <div key={m.id} className={cn("flex gap-3", isVisitor && "flex-row-reverse")}>
                <div
                  className={cn(
                    "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    isVisitor ? "bg-ink-900/[0.08] text-ink-500" : "bg-signal-500/15 text-signal-700"
                  )}
                  aria-hidden="true"
                >
                  {isVisitor ? <User className="h-3.5 w-3.5" /> : <span className="font-display text-xs font-bold">R</span>}
                </div>
                <div className={cn("flex max-w-[80%] flex-col", isVisitor && "items-end")}>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-[11px] font-medium text-ink-500">{roleLabel[m.role] ?? m.role}</span>
                    <span className="font-mono text-[10px] text-ink-300">{formatDateTime(m.created_at)}</span>
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      isVisitor
                        ? "rounded-br-md bg-ink-950 text-paper-50"
                        : m.role === "staff"
                          ? "rounded-bl-md bg-signal-500/10 text-ink-900"
                          : "rounded-bl-md bg-paper-100 text-ink-900"
                    )}
                  >
                    {m.content}
                    {m.tool_calls ? (
                      <p className="mt-2 flex items-center gap-1.5 border-t border-ink-900/[0.08] pt-2 font-mono text-[10px] text-ink-400">
                        <Wrench className="h-3 w-3" aria-hidden="true" />
                        action taken: {JSON.stringify(m.tool_calls)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
