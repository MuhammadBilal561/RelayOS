import { getLeadWithVisitorMessages, updateLead } from "@/lib/server-data";

// Deliberately rule-based and deterministic rather than asking the LLM to
// self-report a score — an agent grading its own conversation is exactly
// the kind of thing that produces inconsistent, unreliable numbers. The
// LLM's job is to extract signals (via capture_lead_info); scoring those
// signals is a plain function so the same inputs always produce the same
// score, and an owner can trust the ranking on the Leads pipeline.
const WEIGHTS = {
  hasEmail: 25,
  hasPhone: 15,
  hasName: 10,
  hasServiceInterest: 15,
  urgency: 20,
  sustainedConversation: 10, // 4+ visitor messages = they're seriously engaged
};

const URGENCY_PATTERN =
  /\b(asap|emergency|urgent|right away|today|tonight|no heat|no ac|no air|leaking|flooding|broken|not working|won't turn on|smells? (?:of |like )?gas)\b/i;

/** Exported separately so it can be unit-tested without needing a live conversation/DB. */
export function detectUrgency(visitorText: string): boolean {
  return URGENCY_PATTERN.test(visitorText);
}

export function computeLeadScore(input: {
  hasName: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasServiceInterest: boolean;
  urgencyDetected: boolean;
  visitorMessageCount: number;
}): number {
  let score = 0;
  if (input.hasEmail) score += WEIGHTS.hasEmail;
  if (input.hasPhone) score += WEIGHTS.hasPhone;
  if (input.hasName) score += WEIGHTS.hasName;
  if (input.hasServiceInterest) score += WEIGHTS.hasServiceInterest;
  if (input.urgencyDetected) score += WEIGHTS.urgency;
  if (input.visitorMessageCount >= 4) score += WEIGHTS.sustainedConversation;
  return Math.min(100, score);
}

/**
 * Recomputes and persists a lead's score from the current state of their
 * record + conversation. Call this after every agent turn — it's cheap
 * (one extra read, one write, no LLM call) and keeps the Leads pipeline
 * accurate in real time as the conversation develops.
 */
export async function recalculateLeadScore(leadId: string, conversationId: string): Promise<number> {
  const { lead, visitorMessages } = await getLeadWithVisitorMessages(leadId, conversationId);

  if (!lead) return 0;

  const combinedVisitorText = visitorMessages.map((m) => m.content).join(" ");

  const score = computeLeadScore({
    hasName: Boolean(lead.name),
    hasEmail: Boolean(lead.email),
    hasPhone: Boolean(lead.phone),
    hasServiceInterest: Boolean(lead.service_interest),
    urgencyDetected: detectUrgency(combinedVisitorText),
    visitorMessageCount: visitorMessages.length,
  });

  await updateLead(leadId, { score, last_scored_at: new Date().toISOString() });

  return score;
}
