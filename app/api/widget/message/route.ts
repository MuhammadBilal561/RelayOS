import { NextRequest, NextResponse } from "next/server";
import { getBusinessByWidgetKey, getOrCreateConversation, getConversationHistory, insertVisitorMessage, insertAssistantMessage, updateLeadStatus, updateConversationStatus } from "@/lib/conversations";
import { runAgentTurn } from "@/lib/ai/agent";
import { checkRateLimit } from "@/lib/rate-limit";
import { recalculateLeadScore } from "@/lib/scoring";

export const runtime = "nodejs";

interface WidgetMessageBody {
  widgetKey: string;
  sessionId: string;
  message: string;
}

export async function POST(req: NextRequest) {
  let body: WidgetMessageBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { widgetKey: rawWidgetKey, sessionId, message } = body;
  if (typeof rawWidgetKey !== "string" || typeof sessionId !== "string" || typeof message !== "string") {
    return NextResponse.json({ error: "widgetKey, sessionId, and message are required" }, { status: 400 });
  }
  const widgetKey = rawWidgetKey.trim();
  const normalizedSessionId = sessionId.trim();
  const normalizedMessage = message.trim();
  if (!widgetKey || !normalizedSessionId || !normalizedMessage) {
    return NextResponse.json({ error: "widgetKey, sessionId, and message are required" }, { status: 400 });
  }
  if (normalizedMessage.length > 2000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  // Protects the business's free-tier Gemini quota from being drained by
  // a single abusive visitor. Swap for Upstash Redis (free tier) once
  // deployed across multiple serverless instances.
  let rateLimit: { allowed: boolean; remaining: number };
  try {
    rateLimit = await checkRateLimit(`widget:${widgetKey}`);
  } catch (err) {
    console.error("Widget rate limiter failed:", err);
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many messages — please wait a moment." }, { status: 429 });
  }

  let business: Awaited<ReturnType<typeof getBusinessByWidgetKey>>;
  try {
    business = await getBusinessByWidgetKey(widgetKey);
  } catch (err) {
    console.error("Widget business lookup failed:", err);
    return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
  }
  if (!business) {
    console.error("Widget key not found:", widgetKey);
    return NextResponse.json({ error: "Unknown widget key" }, { status: 404 });
  }

  try {
    const { leadId, conversationId } = await getOrCreateConversation(business.id, normalizedSessionId);

    // Log the visitor's message before calling the model so the
    // conversation record is complete even if the AI call fails.
    await insertVisitorMessage(conversationId, normalizedMessage);

    const history = await getConversationHistory(conversationId);

    const { reply, toolCalls } = await runAgentTurn({
      businessId: business.id,
      businessName: business.name,
      businessTimezone: business.timezone,
      systemPersona: business.system_persona,
      leadId,
      conversationId,
      history,
      userMessage: normalizedMessage,
    });

    await insertAssistantMessage(conversationId, reply, toolCalls.length > 0 ? { calls: toolCalls } : undefined);

    const score = await recalculateLeadScore(leadId, conversationId);

    return NextResponse.json({
      reply,
      conversationId,
      leadId,
      score,
      escalated: toolCalls.some((t) => t.name === "escalate_to_human"),
    });
  } catch (err) {
    console.error("Widget message handling failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again in a moment." },
      { status: 500 }
    );
  }
}
