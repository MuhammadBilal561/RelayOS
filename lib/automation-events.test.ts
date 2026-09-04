import { describe, it, expect, vi, beforeEach } from "vitest";

const chainResults = new Map<string, { data: unknown; error: unknown }>();
const updateSpy = vi.fn();

function createChain(table: string) {
  const chain: Record<string, unknown> = {};
  const passthroughMethods = ["select", "eq", "single", "insert"];
  for (const method of passthroughMethods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.update = vi.fn((payload: unknown) => {
    updateSpy(table, payload);
    return chain;
  });
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    resolve(chainResults.get(table) ?? { data: null, error: null });
  return chain;
}

const fromSpy = vi.fn((table: string) => createChain(table));

vi.mock("@/lib/supabase/server", () => ({
  createServiceRoleClient: () => ({ from: fromSpy }),
}));

import { emitAutomationEvent } from "@/lib/automation-events";
import { verifyWebhookSignature } from "@/lib/webhook-signing";

beforeEach(() => {
  chainResults.clear();
  fromSpy.mockClear();
  updateSpy.mockClear();
  vi.restoreAllMocks();
});

describe("emitAutomationEvent", () => {
  it("always records the event in automation_events, even with no webhook configured", async () => {
    chainResults.set("automation_events", { data: { id: "evt_1" }, error: null });
    chainResults.set("businesses", { data: { n8n_webhook_url_lead_qualified: null }, error: null });

    await emitAutomationEvent("biz_1", "lead.qualified", { leadId: "lead_1" });

    expect(fromSpy).toHaveBeenCalledWith("automation_events");
    expect(fromSpy).toHaveBeenCalledWith("businesses");
  });

  it("does not attempt delivery when no webhook URL is configured for that event type", async () => {
    chainResults.set("automation_events", { data: { id: "evt_1" }, error: null });
    chainResults.set("businesses", { data: { n8n_webhook_url_lead_qualified: null }, error: null });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await emitAutomationEvent("biz_1", "lead.qualified", {});

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("POSTs the event to the configured webhook and marks it delivered on success", async () => {
    chainResults.set("automation_events", { data: { id: "evt_2" }, error: null });
    chainResults.set("businesses", { data: { n8n_webhook_url_booking_created: "https://n8n.example.com/webhook/booking" }, error: null });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    await emitAutomationEvent("biz_1", "booking.created", { bookingId: "bk_1" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://n8n.example.com/webhook/booking",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.event_type).toBe("booking.created");
    expect(body.payload).toEqual({ bookingId: "bk_1" });

    expect(updateSpy).toHaveBeenCalledWith(
      "automation_events",
      expect.objectContaining({ delivered_at: expect.any(String) })
    );
  });

  it("signs the exact request body sent to the event-specific URL", async () => {
    const secret = "test-signing-secret";
    chainResults.set("automation_events", { data: { id: "evt_signed" }, error: null });
    chainResults.set("businesses", {
      data: {
        n8n_webhook_url_booking_created: "https://n8n.example.com/webhook/booking",
        n8n_webhook_secret: secret,
      },
      error: null,
    });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    await emitAutomationEvent("biz_1", "booking.created", { bookingId: "bk_signed" });

    const [url, request] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://n8n.example.com/webhook/booking");
    expect(request.headers).toEqual(
      expect.objectContaining({
        "Content-Type": "application/json",
        "x-relayos-signature": expect.stringMatching(/^v1=/),
        "x-relayos-timestamp": expect.any(String),
        "x-relayos-nonce": expect.any(String),
      })
    );
    const headers = request.headers as Record<string, string>;
    expect(
      verifyWebhookSignature(
        secret,
        request.body as string,
        headers["x-relayos-signature"],
        headers["x-relayos-timestamp"],
        headers["x-relayos-nonce"]
      ).valid
    ).toBe(true);
  });

  it("records a delivery_error instead of throwing when the webhook returns a non-2xx status", async () => {
    chainResults.set("automation_events", { data: { id: "evt_3" }, error: null });
    chainResults.set("businesses", { data: { n8n_webhook_url_lead_escalated: "https://n8n.example.com/webhook/escalated" }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(emitAutomationEvent("biz_1", "lead.escalated", {})).resolves.toBeUndefined();
    expect(updateSpy).toHaveBeenCalledWith("automation_events", { delivery_error: "HTTP 500" });
  });

  it("records a delivery_error instead of throwing when the webhook is unreachable", async () => {
    chainResults.set("automation_events", { data: { id: "evt_4" }, error: null });
    chainResults.set("businesses", { data: { n8n_webhook_url_lead_escalated: "https://n8n.example.com/webhook/escalated" }, error: null });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(emitAutomationEvent("biz_1", "lead.escalated", {})).resolves.toBeUndefined();
    expect(updateSpy).toHaveBeenCalledWith("automation_events", { delivery_error: "network down" });
  });

  it("never throws even if the initial insert fails", async () => {
    chainResults.set("automation_events", { data: null, error: { message: "insert failed" } });

    await expect(emitAutomationEvent("biz_1", "lead.qualified", {})).resolves.toBeUndefined();
  });

  it("each event type selects its own webhook URL column", async () => {
    chainResults.set("automation_events", { data: { id: "evt_1" }, error: null });
    chainResults.set("businesses", { 
      data: { 
        n8n_webhook_url_lead_qualified: "https://n8n.example.com/qualified",
        n8n_webhook_url_lead_escalated: "https://n8n.example.com/escalated",
        n8n_webhook_url_booking_created: "https://n8n.example.com/booking"
      }, error: null 
    });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    await emitAutomationEvent("biz_1", "lead.qualified", { leadId: "1" });
    expect(fetchSpy).toHaveBeenCalledWith("https://n8n.example.com/qualified", expect.any(Object));

    fetchSpy.mockClear();
    await emitAutomationEvent("biz_1", "lead.escalated", { leadId: "1" });
    expect(fetchSpy).toHaveBeenCalledWith("https://n8n.example.com/escalated", expect.any(Object));

    fetchSpy.mockClear();
    await emitAutomationEvent("biz_1", "booking.created", { bookingId: "1" });
    expect(fetchSpy).toHaveBeenCalledWith("https://n8n.example.com/booking", expect.any(Object));
  });

  it("one event's URL does not affect another event's delivery", async () => {
    chainResults.set("automation_events", { data: { id: "evt_1" }, error: null });
    // Only lead.qualified has a URL; others are null
    chainResults.set("businesses", { 
      data: { 
        n8n_webhook_url_lead_qualified: "https://n8n.example.com/qualified",
        n8n_webhook_url_lead_escalated: null,
        n8n_webhook_url_booking_created: null
      }, error: null 
    });
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchSpy);

    await emitAutomationEvent("biz_1", "lead.qualified", {});
    await emitAutomationEvent("biz_1", "lead.escalated", {});
    await emitAutomationEvent("biz_1", "booking.created", {});

    // Only lead.qualified should have attempted delivery
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://n8n.example.com/qualified", expect.any(Object));
  });
});
