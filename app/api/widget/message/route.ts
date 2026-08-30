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

  const { widgetKey, sessionId, message } = body;
  if (!widgetKey || !sessionId || !message?.trim()) {
    return NextResponse.json({ error: "widgetKey, sessionId, and message are required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  // Protects the business's free-tier Gemini quota from being drained by
  // a single abusive visitor. Swap for Upstash Redis (free tier) once
  // deployed across multiple serverless instances — see docs/SECURITY.md.
  const rateLimit = await checkRateLimit(`widget:${widgetKey}`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many messages — please wait a moment." }, { status: 429 });
  }

  const business = await getBusinessByWidgetKey(widgetKey);
  if (!business) {
    console.error("Widget key not found:", widgetKey);
    return NextResponse.json({ error: "Unknown widget key" }, { status: 404 });
  }

  try {
    const { leadId, conversationId } = await getOrCreateConversation(business.id, sessionId);

    // Log the visitor's message before calling the model so the
    // conversation record is complete even if the AI call fails.
    await insertVisitorMessage(conversationId, message);

    const history = await getConversationHistory(conversationId);

    const { reply, toolCalls } = await runAgentTurn({
      businessId: business.id,
      businessName: business.name,
      businessTimezone: business.timezone,
      systemPersona: business.system_persona,
      leadId,
      conversationId,
      history,
      userMessage: message,
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
