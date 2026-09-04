import Link from "next/link";
import { ArrowLeft, Wrench, User } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-business";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { PageShell } from "@/components/dashboard/page-shell";

export default async function ConversationDetailPage({ params }: { params: { conversationId: string } }) {
  const business = await getCurrentBusiness();
  const supabase = createServerSupabaseClient();

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
    <PageShell width="narrow">
      <Link
        href="/inbox"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors duration-150 hover:text-ink-950"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to inbox
      </Link>

      <div className="mt-5 overflow-hidden rounded-2xl border border-ink-900/8 bg-[#fffdf8] shadow-[0_18px_40px_-24px_rgba(55,40,18,0.28)]">
        <div className="flex flex-col gap-4 border-b border-ink-900/8 bg-ink-950 px-5 py-5 text-white sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={lead?.name ?? lead?.email} size="md" className="bg-white/10 text-signal-300 ring-white/10" />
            <div>
              <h1 className="font-display text-xl font-semibold tracking-tight">
                {lead?.name || lead?.email || "Anonymous visitor"}
              </h1>
              <p className="mt-1 text-sm text-white/55">
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

        <div className="p-5 sm:p-6">
          {(!messages || messages.length === 0) ? (
            <div className="rounded-xl border border-dashed border-ink-900/12 bg-[#faf6ef] px-6 py-14 text-center">
              <p className="text-sm font-medium text-ink-900">No messages</p>
              <p className="mt-1 text-sm text-ink-500">The transcript for this conversation is empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => {
                const isVisitor = m.role === "visitor";
                return (
                  <div key={m.id} className={cn("flex gap-3", isVisitor && "flex-row-reverse")}>
                    <div
                      className={cn(
                        "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        isVisitor ? "bg-ink-950 text-white" : "bg-signal-500 text-ink-950"
                      )}
                      aria-hidden="true"
                    >
                      {isVisitor ? <User className="h-3.5 w-3.5" /> : <span className="font-display text-xs font-bold">R</span>}
                    </div>
                    <div className={cn("flex max-w-[82%] flex-col", isVisitor && "items-end")}>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-[11px] font-medium text-ink-500">{roleLabel[m.role] ?? m.role}</span>
                        <span className="text-[10px] text-ink-400">{formatDateTime(m.created_at)}</span>
                      </div>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                          isVisitor
                            ? "dash-chat-visitor rounded-br-md"
                            : m.role === "staff"
                              ? "rounded-bl-md bg-signal-500/15 text-ink-900"
                              : "rounded-bl-md bg-[#f3eee4] text-ink-900"
                        )}
                      >
                        {m.content}
                        {m.tool_calls ? (
                          <p className="mt-2 flex items-center gap-1.5 border-t border-current/10 pt-2 font-mono text-[10px] text-ink-400">
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
      </div>
    </PageShell>
  );
}
