import { getGeminiClient, CHAT_MODEL } from "@/lib/ai/gemini";
import { agentTools, executeTool } from "@/lib/ai/tools";
import { buildSystemInstruction } from "@/lib/ai/prompts";
import { retrieveRelevantChunks } from "@/lib/rag/retrieve";
import type { MessageRole } from "@/types/database";

export interface ChatHistoryItem {
  role: MessageRole;
  content: string;
}

export interface AgentTurnResult {
  reply: string;
  toolCalls: Array<{ name: string; args: Record<string, unknown>; result: Record<string, unknown> }>;
}

/**
 * Runs one full turn of the front-office agent:
 *   1. Retrieve grounding context from the business's knowledge base (RAG)
 *   2. Build the system prompt
 *   3. Call Gemini with tools enabled
 *   4. Execute any requested tool calls and loop the result back to the
 *      model until it produces a final text reply
 *
 * This is intentionally a plain function (not a persisted chat session)
 * so it works cleanly in a stateless serverless route handler — full
 * history is reloaded from Postgres on every call.
 */
export async function runAgentTurn(params: {
  businessId: string;
  businessName: string;
  businessTimezone: string;
  systemPersona: string | null;
  leadId: string;
  conversationId: string;
  history: ChatHistoryItem[];
  userMessage: string;
}): Promise<AgentTurnResult> {
  const retrievedChunks = await retrieveRelevantChunks(params.businessId, params.userMessage);

  const ai = getGeminiClient();
  const chat = ai.chats.create({
    model: CHAT_MODEL,
    history: params.history
      .filter((m) => m.role === "visitor" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "visitor" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    config: {
      systemInstruction: buildSystemInstruction({
        businessName: params.businessName,
        businessTimezone: params.businessTimezone,
        systemPersona: params.systemPersona,
        retrievedChunks,
      }),
      tools: [{ functionDeclarations: agentTools }],
    },
  });

  let response = await chat.sendMessage({ message: params.userMessage });
  const toolCalls: AgentTurnResult["toolCalls"] = [];

  // Tool-calling loop: the model may request multiple sequential actions
  // (e.g. capture_lead_info, then escalate_to_human) before finishing.
  let safetyCounter = 0;
  while (response.functionCalls && response.functionCalls.length > 0 && safetyCounter < 5) {
    safetyCounter += 1;
    const call = response.functionCalls[0];
    const args = (call.args ?? {}) as Record<string, unknown>;
    const result = await executeTool(call.name ?? "", args, {
      businessId: params.businessId,
      leadId: params.leadId,
      conversationId: params.conversationId,
    });
    toolCalls.push({ name: call.name ?? "unknown", args, result });

    response = await chat.sendMessage({
      message: {
        functionResponse: { name: call.name ?? "unknown", response: result },
      },
    });
  }

  return {
    reply: response.text ?? "Sorry, I didn't catch that — could you rephrase?",
    toolCalls,
  };
}
