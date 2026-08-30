import { 
  getBusinessByWidgetKey as getBusinessByWidgetKeyAdmin,
  getOrCreateConversation as getOrCreateConversationAdmin,
  getConversationHistory as getConversationHistoryAdmin,
  insertMessage as insertMessageAdmin,
  updateLead as updateLeadAdmin,
  updateConversation as updateConversationAdmin,
} from "@/lib/server-data";
import type { LeadStatus, ConversationRow } from "@/types/database";

/**
 * Looks up the business behind a widget's public key. This is the only
 * "authentication" the public widget endpoint has — the key is safe to
 * expose in embed.js because it can only ever create/read that one
 * business's own leads and conversations, nothing else.
 */
export async function getBusinessByWidgetKey(widgetKey: string) {
  return getBusinessByWidgetKeyAdmin(widgetKey);
}

/**
 * Finds the lead + open conversation for a given visitor session,
 * creating both on the visitor's first message.
 */
export async function getOrCreateConversation(businessId: string, visitorSessionId: string) {
  return getOrCreateConversationAdmin(businessId, visitorSessionId);
}

/** Loads message history for a conversation, oldest first. */
export async function getConversationHistory(conversationId: string) {
  return getConversationHistoryAdmin(conversationId);
}

export async function insertVisitorMessage(conversationId: string, content: string) {
  return insertMessageAdmin(conversationId, "visitor", content);
}

export async function insertAssistantMessage(conversationId: string, content: string, toolCalls?: Record<string, unknown>) {
  return insertMessageAdmin(conversationId, "assistant", content, toolCalls);
}

export async function updateLeadStatus(leadId: string, status: LeadStatus, extra?: Record<string, unknown>) {
  return updateLeadAdmin(leadId, { status, ...extra });
}

export async function updateConversationStatus(conversationId: string, status: string, summary?: string) {
  return updateConversationAdmin(conversationId, { status, summary_text: summary } as Partial<ConversationRow>);
}
