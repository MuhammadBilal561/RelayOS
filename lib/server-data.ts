import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

/**
 * Server-only privileged data access layer.
 * All functions here use the service-role client and BYPASS RLS.
 * Callers MUST validate authorization before calling these functions.
 * 
 * The pattern is:
 * 1. Public endpoint validates widget key / user session → gets businessId
 * 2. Public endpoint calls these functions with the validated businessId
 * 3. These functions trust the businessId is authorized (enforced by caller)
 */

const supabaseAdmin = () => createServiceRoleClient();

export async function getBusinessByWidgetKey(widgetKey: string) {
  const key = widgetKey.trim();
  const { data, error } = await supabaseAdmin()
    .from("businesses")
    .select("id, name, brand_color, system_persona, timezone, organization_id, industry, public_widget_key, created_at")
    .eq("public_widget_key", key)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("Widget key lookup failed:", error.message);
    throw new Error(`Failed to resolve widget: ${error.message}`);
  }
  if (!data) return null;
  return data;
}

export async function getBusinessById(businessId: string) {
  const { data, error } = await supabaseAdmin()
    .from("businesses")
    .select(
      "id, name, brand_color, system_persona, timezone, organization_id, industry, public_widget_key, " +
        "n8n_webhook_url, n8n_webhook_url_lead_qualified, n8n_webhook_url_lead_escalated, " +
        "n8n_webhook_url_booking_created, n8n_webhook_secret, created_at"
    )
    .eq("id", businessId)
    .single();

  if (error) throw new Error(`Failed to load business: ${error.message}`);
  if (!data) return null;
  return data;
}

export async function getLeadById(leadId: string): Promise<LeadRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  if (!data) return null;
  return data;
}

export async function getConversationById(conversationId: string): Promise<ConversationRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .single();

  if (error) throw new Error(`Failed to load conversation: ${error.message}`);
  if (!data) return null;
  return data;
}

export async function getOrCreateConversation(businessId: string, visitorSessionId: string) {
  const leadLookup = await supabaseAdmin()
    .from("leads")
    .select("id, status")
    .eq("business_id", businessId)
    .eq("visitor_session_id", visitorSessionId)
    .maybeSingle();
  if (leadLookup.error) throw new Error(`Failed to find lead: ${leadLookup.error.message}`);
  let lead = leadLookup.data;

  if (!lead) {
    const { data: newLead, error } = await supabaseAdmin()
      .from("leads")
      .insert({ business_id: businessId, visitor_session_id: visitorSessionId, source: "widget" })
      .select("id, status")
      .single();
    if (error && error.code !== "23505") throw new Error(`Failed to create lead: ${error.message}`);
    if (newLead) {
      lead = newLead;
    } else {
      const retry = await supabaseAdmin()
        .from("leads")
        .select("id, status")
        .eq("business_id", businessId)
        .eq("visitor_session_id", visitorSessionId)
        .single();
      if (retry.error || !retry.data) throw new Error(`Failed to create lead: ${retry.error?.message ?? "lead was not returned"}`);
      lead = retry.data;
    }
  }

  const conversationLookup = await supabaseAdmin()
    .from("conversations")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (conversationLookup.error) throw new Error(`Failed to find conversation: ${conversationLookup.error.message}`);
  let conversation = conversationLookup.data;

  if (!conversation) {
    const { data: newConversation, error } = await supabaseAdmin()
      .from("conversations")
      .insert({ lead_id: lead.id, business_id: businessId, channel: "widget" })
      .select("id")
      .single();
    if (error && error.code !== "23505") throw new Error(`Failed to create conversation: ${error.message}`);
    if (newConversation) {
      conversation = newConversation;
    } else {
      const retry = await supabaseAdmin()
        .from("conversations")
        .select("id")
        .eq("lead_id", lead.id)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (retry.error || !retry.data) throw new Error(`Failed to create conversation: ${retry.error?.message ?? "conversation was not returned"}`);
      conversation = retry.data;
    }
  }

  return { leadId: lead.id, conversationId: conversation.id };
}

export async function getConversationHistory(conversationId: string) {
  const { data, error } = await supabaseAdmin()
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load conversation history: ${error.message}`);
  return data ?? [];
}

export async function insertMessage(
  conversationId: string,
  role: "visitor" | "assistant",
  content: string,
  toolCalls?: Record<string, unknown>
) {
  const { error } = await supabaseAdmin().from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    tool_calls: toolCalls ?? null,
  });
  if (error) throw new Error(`Failed to insert message: ${error.message}`);
}

export async function updateLead(leadId: string, updates: Partial<LeadRow>) {
  const { error } = await supabaseAdmin().from("leads").update(updates).eq("id", leadId);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

export async function updateConversation(conversationId: string, updates: Partial<ConversationRow>) {
  const { error } = await supabaseAdmin().from("conversations").update(updates).eq("id", conversationId);
  if (error) throw new Error(`Failed to update conversation: ${error.message}`);
}

export async function getCalendarConnection(businessId: string) {
  const { data, error } = await supabaseAdmin()
    .from("calendar_connections")
    .select("access_token, refresh_token, token_expires_at, calendar_id")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get calendar connection: ${error.message}`);
  return data;
}

export async function updateCalendarConnection(businessId: string, updates: {
  access_token?: string;
  token_expires_at?: string;
}) {
  const { error } = await supabaseAdmin()
    .from("calendar_connections")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("business_id", businessId);
  if (error) throw new Error(`Failed to update calendar connection: ${error.message}`);
}

export async function insertBooking(booking: {
  lead_id: string;
  business_id: string;
  start_time: string;
  end_time: string;
  calendar_event_id: string;
}) {
  // bookings carries both ids, so validate the relationship explicitly. The
  // separate foreign keys only guarantee that each row exists; without this
  // check a booking could be attached to a lead from another business.
  const { data: lead, error: leadError } = await supabaseAdmin()
    .from("leads")
    .select("id")
    .eq("id", booking.lead_id)
    .eq("business_id", booking.business_id)
    .maybeSingle();

  if (leadError) throw new Error(`Failed to validate booking contact: ${leadError.message}`);
  if (!lead) throw new Error("Failed to insert booking: lead does not belong to business");

  const { data, error } = await supabaseAdmin()
    .from("bookings")
    .insert(booking)
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to insert booking: ${error?.message}`);
  return data.id;
}

export async function insertAutomationEvent(businessId: string, eventType: string, payload: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin()
    .from("automation_events")
    .insert({ business_id: businessId, event_type: eventType, payload })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Failed to insert automation event: ${error?.message}`);
  return data.id;
}

export async function updateAutomationEventDelivery(eventId: string, delivered: boolean, error?: string) {
  const { error: updateError } = await supabaseAdmin()
    .from("automation_events")
    .update(delivered ? { delivered_at: new Date().toISOString() } : { delivery_error: error ?? "Unknown delivery error" })
    .eq("id", eventId);
  if (updateError) throw new Error(`Failed to update automation event: ${updateError.message}`);
}

export async function getBusinessWebhookConfig(businessId: string) {
  const { data, error } = await supabaseAdmin()
    .from("businesses")
    .select(`
      n8n_webhook_url_lead_qualified,
      n8n_webhook_url_lead_escalated,
      n8n_webhook_url_booking_created,
      n8n_webhook_secret
    `)
    .eq("id", businessId)
    .single();

  if (error) throw new Error(`Failed to get webhook config: ${error.message}`);
  return data;
}

export async function getKnowledgeBaseChunks(businessId: string, queryEmbedding: number[], matchCount: number) {
  const { data, error } = await supabaseAdmin().rpc("match_kb_chunks", {
    p_business_id: businessId,
    p_query_embedding: queryEmbedding,
    p_match_count: matchCount,
  });
  if (error) throw new Error(`RAG retrieval failed: ${error.message}`);
  return data ?? [];
}

export async function ingestKnowledgeDocument(businessId: string, document: {
  title: string;
  source_type: string;
  content_text: string;
  chunks: { chunk_text: string; embedding: number[] }[];
}) {
  const { data: doc, error: docError } = await supabaseAdmin()
    .from("kb_documents")
    .insert({
      business_id: businessId,
      title: document.title,
      source_type: document.source_type,
      content_text: document.content_text,
    })
    .select()
    .single();

  if (docError || !doc) throw new Error(`Failed to store document: ${docError?.message}`);

  for (const chunk of document.chunks) {
    const { error: chunkError } = await supabaseAdmin().from("kb_chunks").insert({
      document_id: doc.id,
      business_id: businessId,
      chunk_text: chunk.chunk_text,
      embedding: chunk.embedding,
    });
    if (chunkError) throw new Error(`Failed to store chunk: ${chunkError.message}`);
  }

  return { documentId: doc.id, chunksIngested: document.chunks.length };
}

export async function getLeadWithVisitorMessages(leadId: string, conversationId: string) {
  const [leadResult, messagesResult] = await Promise.all([
    supabaseAdmin().from("leads").select("name, email, phone, service_interest").eq("id", leadId).single(),
    supabaseAdmin().from("messages").select("content").eq("conversation_id", conversationId).eq("role", "visitor"),
  ]);

  if (leadResult.error) throw new Error(`Failed to load lead for scoring: ${leadResult.error.message}`);
  if (messagesResult.error) throw new Error(`Failed to load messages for scoring: ${messagesResult.error.message}`);
  return { lead: leadResult.data, visitorMessages: messagesResult.data ?? [] };
}