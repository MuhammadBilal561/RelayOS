import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Integration-style tests for the highest-traffic, highest-value route in the
// app: app/api/widget/message/route.ts. We mock every external boundary (the
// Supabase client, the RAG/agent turn, scoring, rate limiting) but exercise
// the REAL POST handler so the request-validation, error-handling, and
// response-shaping logic is actually covered.

const h = vi.hoisted(() => {
  const runAgentTurnMock = vi.fn();
  const getBusinessByWidgetKeyMock = vi.fn();
  const getOrCreateConversationMock = vi.fn();
  const getConversationHistoryMock = vi.fn();
  const insertVisitorMessageMock = vi.fn();
  const insertAssistantMessageMock = vi.fn();
  const recalculateLeadScoreMock = vi.fn();
  const checkRateLimitMock = vi.fn();
  return {
    runAgentTurnMock,
    getBusinessByWidgetKeyMock,
    getOrCreateConversationMock,
    getConversationHistoryMock,
    insertVisitorMessageMock,
    insertAssistantMessageMock,
    recalculateLeadScoreMock,
    checkRateLimitMock,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: () => ({ insert: vi.fn() }) }),
}));
vi.mock("@/lib/conversations", () => ({
  getBusinessByWidgetKey: h.getBusinessByWidgetKeyMock,
  getOrCreateConversation: h.getOrCreateConversationMock,
  getConversationHistory: h.getConversationHistoryMock,
  insertVisitorMessage: h.insertVisitorMessageMock,
  insertAssistantMessage: h.insertAssistantMessageMock,
}));
vi.mock("@/lib/ai/agent", () => ({ runAgentTurn: h.runAgentTurnMock }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: h.checkRateLimitMock }));
vi.mock("@/lib/scoring", () => ({ recalculateLeadScore: h.recalculateLeadScoreMock }));

import { POST } from "./route";

const WIDGET_KEY = "demo-widget-key";
const SESSION = "session_abc";

const business = {
  id: "biz_1",
  name: "Aurora HVAC & Air",
  brand_color: "#F2A93B",
  system_persona: null,
  timezone: "America/Chicago",
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/widget/message", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  h.runAgentTurnMock.mockReset();
  h.getBusinessByWidgetKeyMock.mockReset();
  h.getOrCreateConversationMock.mockReset();
  h.getConversationHistoryMock.mockReset();
  h.insertVisitorMessageMock.mockReset();
  h.insertAssistantMessageMock.mockReset();
  h.recalculateLeadScoreMock.mockReset();
  h.checkRateLimitMock.mockReset();

  h.checkRateLimitMock.mockReturnValue({ allowed: true, remaining: 11 });
  h.getBusinessByWidgetKeyMock.mockResolvedValue(business);
  h.getOrCreateConversationMock.mockResolvedValue({ leadId: "lead_1", conversationId: "conv_1" });
  h.getConversationHistoryMock.mockResolvedValue([]);
  h.recalculateLeadScoreMock.mockResolvedValue(25);
  h.insertVisitorMessageMock.mockResolvedValue(undefined);
  h.insertAssistantMessageMock.mockResolvedValue(undefined);
});

describe("POST /api/widget/message — validation", () => {
  it("returns 400 for invalid JSON", async () => {
    const req = new NextRequest("http://localhost:3000/api/widget/message", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid JSON body");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION })); // no message
    expect(res.status).toBe(400);
  });

  it("returns 400 instead of throwing when required fields have the wrong types", async () => {
    const res = await POST(makeRequest({ widgetKey: 42, sessionId: {}, message: "hello" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for a message exceeding 2000 chars", async () => {
    const res = await POST(
      makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION, message: "x".repeat(2001) })
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/widget/message — rate limiting", () => {
  it("returns 429 when the visitor is rate-limited", async () => {
    h.checkRateLimitMock.mockReturnValue({ allowed: false, remaining: 0 });
    const res = await POST(makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION, message: "hello" }));
    expect(res.status).toBe(429);
    // Must not reach the agent.
    expect(h.runAgentTurnMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/widget/message — business resolution", () => {
  it("returns 404 for an unknown widget key", async () => {
    h.getBusinessByWidgetKeyMock.mockResolvedValue(null);
    const res = await POST(makeRequest({ widgetKey: "nope", sessionId: SESSION, message: "hi" }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/widget/message — happy path", () => {
  it("logs the visitor message, runs the agent, stores the reply, and returns enriched response", async () => {
    h.runAgentTurnMock.mockResolvedValue({
      reply: "Our AC repair starts at $499.",
      toolCalls: [{ name: "capture_lead_info", args: { email: "jane@example.com" } }],
    });

    const res = await POST(makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION, message: "What does AC repair cost?" }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.reply).toBe("Our AC repair starts at $499.");
    expect(json.conversationId).toBe("conv_1");
    expect(json.leadId).toBe("lead_1");
    expect(json.score).toBe(25);
    expect(json.escalated).toBe(false);

    // Two message inserts: visitor + assistant.
    expect(h.insertVisitorMessageMock).toHaveBeenCalledTimes(1);
    expect(h.insertAssistantMessageMock).toHaveBeenCalledTimes(1);
    // The visitor message is persisted BEFORE the AI call so the record is
    // complete even if the model fails.
    expect(h.insertVisitorMessageMock).toHaveBeenCalledWith("conv_1", "What does AC repair cost?");
    expect(h.recalculateLeadScoreMock).toHaveBeenCalledWith("lead_1", "conv_1");
  });

  it("flags escalated=true when the agent escalates to a human", async () => {
    h.runAgentTurnMock.mockResolvedValue({
      reply: "Let me connect you with a human.",
      toolCalls: [{ name: "escalate_to_human", args: { reason: "same-day" } }],
    });

    const res = await POST(makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION, message: "I need help now" }));
    const json = await res.json();
    expect(json.escalated).toBe(true);
  });

  it("returns 500 with a safe message when the agent turn throws", async () => {
    h.runAgentTurnMock.mockRejectedValue(new Error("gemini down"));
    const res = await POST(makeRequest({ widgetKey: WIDGET_KEY, sessionId: SESSION, message: "hello" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    // Must not leak the internal error message to the visitor.
    expect(json.error).not.toContain("gemini");
    expect(json.error).toContain("Something went wrong");
  });
});
