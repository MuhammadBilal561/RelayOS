import { describe, it, expect } from "vitest";
import {
  WEBHOOK_URL_FIELDS,
  isMissingColumnError,
  resolveAutomationWebhookUrls,
} from "./automation-webhooks";

describe("resolveAutomationWebhookUrls", () => {
  it("AUTOMATION URL TEST: three unique saved URLs stay unique after a read (reload)", () => {
    const saved = {
      n8n_webhook_url_lead_qualified: "https://a.example.com/webhook",
      n8n_webhook_url_lead_escalated: "https://b.example.com/webhook",
      n8n_webhook_url_booking_created: "https://c.example.com/webhook",
    };

    const loaded = resolveAutomationWebhookUrls(saved);

    expect(loaded.n8n_webhook_url_lead_qualified).toBe("https://a.example.com/webhook");
    expect(loaded.n8n_webhook_url_lead_escalated).toBe("https://b.example.com/webhook");
    expect(loaded.n8n_webhook_url_booking_created).toBe("https://c.example.com/webhook");
    expect(new Set(Object.values(loaded)).size).toBe(3);
  });

  it("maps each event field independently — one URL never leaks into another event", () => {
    const loaded = resolveAutomationWebhookUrls({
      n8n_webhook_url_lead_qualified: "https://a.example.com/webhook",
      n8n_webhook_url_lead_escalated: null,
      n8n_webhook_url_booking_created: "https://c.example.com/webhook",
    });

    expect(loaded.n8n_webhook_url_lead_qualified).toBe("https://a.example.com/webhook");
    expect(loaded.n8n_webhook_url_lead_escalated).toBe("");
    expect(loaded.n8n_webhook_url_booking_created).toBe("https://c.example.com/webhook");
  });

  it("preserves explicit per-event nulls so clearing one event disables only that event", () => {
    const loaded = resolveAutomationWebhookUrls({
      n8n_webhook_url: "https://legacy.example.com/webhook",
      n8n_webhook_url_lead_qualified: null,
      n8n_webhook_url_lead_escalated: null,
      n8n_webhook_url_booking_created: null,
    });

    expect(loaded).toEqual({
      n8n_webhook_url_lead_qualified: "",
      n8n_webhook_url_lead_escalated: "",
      n8n_webhook_url_booking_created: "",
    });
  });

  it("uses the legacy column only when the per-event columns are absent", () => {
    const loaded = resolveAutomationWebhookUrls({
      n8n_webhook_url: "https://legacy.example.com/webhook",
    });

    expect(loaded.n8n_webhook_url_booking_created).toBe("https://legacy.example.com/webhook");
    expect(loaded.n8n_webhook_url_lead_qualified).toBe("https://legacy.example.com/webhook");
  });

  it("per-event value wins over the legacy column", () => {
    const loaded = resolveAutomationWebhookUrls({
      n8n_webhook_url: "https://legacy.example.com/webhook",
      n8n_webhook_url_lead_qualified: null,
      n8n_webhook_url_lead_escalated: null,
      n8n_webhook_url_booking_created: "https://c.example.com/webhook",
    });

    expect(loaded.n8n_webhook_url_booking_created).toBe("https://c.example.com/webhook");
    expect(loaded.n8n_webhook_url_lead_qualified).toBe("");
  });

  it("returns empty strings for a missing row", () => {
    expect(resolveAutomationWebhookUrls(null)).toEqual({
      n8n_webhook_url_lead_qualified: "",
      n8n_webhook_url_lead_escalated: "",
      n8n_webhook_url_booking_created: "",
    });
  });

  it("exposes exactly the three per-event fields", () => {
    expect(WEBHOOK_URL_FIELDS).toEqual([
      "n8n_webhook_url_lead_qualified",
      "n8n_webhook_url_lead_escalated",
      "n8n_webhook_url_booking_created",
    ]);
  });
});

describe("isMissingColumnError", () => {
  it("detects PostgREST missing-column errors", () => {
    expect(
      isMissingColumnError({
        code: "42703",
        message: "column businesses.n8n_webhook_url_lead_qualified does not exist",
      })
    ).toBe(true);
  });

  it("detects stale schema-cache messages", () => {
    expect(
      isMissingColumnError({
        message: "Could not find the 'n8n_webhook_url_booking_created' column of 'businesses' in the schema cache",
      })
    ).toBe(true);
  });

  it("ignores unrelated errors", () => {
    expect(isMissingColumnError({ message: "RLS violation" })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });
});
