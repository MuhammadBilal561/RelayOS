import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Looks up the business behind a widget's public key. This is the only
 * "authentication" the public widget endpoint has — the key is safe to
 * expose in embed.js because it can only ever create/read that one
 * business's own leads and conversations, nothing else.
 */
export async function getBusinessByWidgetKey(widgetKey: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, brand_color, system_persona, timezone")
    .eq("public_widget_key", widgetKey)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * Finds the lead + open conversation for a given visitor session,
 * creating both on the visitor's first message.
 */
export async function getOrCreateConversation(businessId: string, visitorSessionId: string) {
  const supabase = createServiceRoleClient();

  let { data: lead } = await supabase
    .from("leads")
    .select("id, status")
    .eq("business_id", businessId)
    .eq("visitor_session_id", visitorSessionId)
    .maybeSingle();

  if (!lead) {
    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({ business_id: businessId, visitor_session_id: visitorSessionId, source: "widget" })
      .select("id, status")
      .single();
    if (error || !newLead) throw new Error(`Failed to create lead: ${error?.message}`);
    lead = newLead;
  }

  let { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({ lead_id: lead.id, business_id: businessId, channel: "widget" })
      .select("id")
      .single();
    if (error || !newConversation) throw new Error(`Failed to create conversation: ${error?.message}`);
    conversation = newConversation;
  }

  return { leadId: lead.id, conversationId: conversation.id };
}

/** Loads message history for a conversation, oldest first. */
export async function getConversationHistory(conversationId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load conversation history: ${error.message}`);
  return data ?? [];
}
