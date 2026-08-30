import { getGeminiClient, CHAT_MODEL } from "@/lib/ai/gemini";

/**
 * Produces a short, human-facing summary of a conversation so a staff
 * member picking up an escalation gets "what they want + key details" in
 * one glance instead of having to re-read the whole transcript. This is a
 * plain one-shot generation call, not a tool the agent decides to use —
 * it's triggered by the app whenever escalate_to_human fires.
 */
export async function summarizeConversation(
  messages: { role: string; content: string }[]
): Promise<string> {
  if (messages.length === 0) return "No messages yet.";

  const transcript = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: `Summarize this front-desk chat transcript for a human teammate who is about to take over the conversation. One or two sentences, plain text, no preamble: what the visitor wants, plus any contact info or urgency already mentioned.

Transcript:
${transcript}`,
  });

  return response.text?.trim() || "Summary unavailable — see full transcript.";
}
