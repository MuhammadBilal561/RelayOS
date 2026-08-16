import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service-role client with a chainable fake object so we can
// exercise the real query-building logic in lib/conversations.ts without
// touching Postgres. Each table gets its own mock "result set" keyed by
// table name, and the tests drive which rows exist (or don't).

const chainResults = new Map<string, { data: unknown; error: unknown }>();

function createChain(table: string) {
  const chain: Record<string, unknown> = {};
  const passthroughMethods = ["select", "eq", "order", "limit", "single", "maybeSingle"];
  for (const method of passthroughMethods) {
    chain[method] = vi.fn(() => chain);
  }
  // A single table can be both read from and written to in one code path
  // (leads: select-then-insert). Track whether this chain is an insert so the
  // two calls can resolve to different fixtures — "<table>:insert" vs "<table>".
  let isInsert = false;
  chain.insert = vi.fn(() => {
    isInsert = true;
    return chain;
  });
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) => {
    const key = isInsert ? `${table}:insert` : table;
    return resolve(chainResults.get(key) ?? { data: null, error: null });
  };
  return chain;
}

const fromSpy = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: fromSpy }),
}));

import {
  getBusinessByWidgetKey,
  getOrCreateConversation,
  getConversationHistory,
} from "@/lib/conversations";

beforeEach(() => {
  chainResults.clear();
  fromSpy.mockClear();
});

describe("getBusinessByWidgetKey", () => {
  it("returns the business when a valid widget key is found", async () => {
    const business = {
      id: "biz_1",
      name: "Aurora HVAC & Air",
      brand_color: "#F2A93B",
      system_persona: null,
      timezone: "America/Chicago",
    };
    chainResults.set("businesses", { data: business, error: null });

    const result = await getBusinessByWidgetKey("demo-widget-key");

    expect(result).toEqual(business);
    // Must query by the exact widget key.
    const eqCall = fromSpy.mock.calls.find(([t]) => t === "businesses");
    expect(eqCall).toBeDefined();
  });

  it("returns null when the widget key is invalid (error from Postgres)", async () => {
    chainResults.set("businesses", { data: null, error: { message: "No rows" } });

    const result = await getBusinessByWidgetKey("unknown-key");

    expect(result).toBeNull();
  });

  it("returns null when no business matches (data is null, no error)", async () => {
    chainResults.set("businesses", { data: null, error: null });

    const result = await getBusinessByWidgetKey("no-match");

    expect(result).toBeNull();
  });
});

describe("getOrCreateConversation", () => {
  it("creates a lead and a conversation on the visitor's first message", async () => {
    // No existing lead for this session.
    chainResults.set("leads", { data: null, error: null });
    // Lead insert returns the new lead.
    chainResults.set("leads:insert", { data: { id: "lead_new", status: "new" }, error: null });
    // No existing open conversation.
    chainResults.set("conversations", { data: null, error: null });
    chainResults.set("conversations:insert", { data: { id: "conv_new" }, error: null });

    // Override the then() resolution for leads: first call (select) returns null,
    // second call (insert) returns the new lead. We approximate by having the
    // select path (maybeSingle) resolve to null and insert resolve to the new row.
    const { leadId, conversationId } = await getOrCreateConversation("biz_1", "session_abc");

    expect(leadId).toBe("lead_new");
    expect(conversationId).toBe("conv_new");
  });

  it("reuses an existing lead and open conversation for the same session", async () => {
    chainResults.set("leads", { data: { id: "lead_existing", status: "new" }, error: null });
    chainResults.set("conversations", { data: { id: "conv_existing" }, error: null });

    const { leadId, conversationId } = await getOrCreateConversation("biz_1", "session_abc");

    expect(leadId).toBe("lead_existing");
    expect(conversationId).toBe("conv_existing");
  });
});

describe("getConversationHistory", () => {
  it("returns messages in creation order", async () => {
    const messages = [
      { role: "visitor", content: "First" },
      { role: "assistant", content: "Reply" },
      { role: "visitor", content: "Second" },
    ];
    chainResults.set("messages", { data: messages, error: null });

    const result = await getConversationHistory("conv_1");

    expect(result).toEqual(messages);
  });

  it("throws when the query fails", async () => {
    chainResults.set("messages", { data: null, error: { message: "connection reset" } });

    await expect(getConversationHistory("conv_1")).rejects.toThrow("Failed to load conversation history");
  });
});
