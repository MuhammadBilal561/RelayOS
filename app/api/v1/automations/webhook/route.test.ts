import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fromSpy = vi.fn();
const getUserMock = vi.fn();
const updatePayloads: unknown[] = [];

const successfulUpdate = () => ({
  select: () => ({ maybeSingle: () => Promise.resolve({ data: { id: "biz" }, error: null }) }),
});

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: () => ({
    auth: { getUser: getUserMock },
    from: fromSpy,
  }),
}));

const makeRequest = (body: Record<string, unknown>) => {
  return new NextRequest("http://localhost:3000/api/v1/automations/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  getUserMock.mockClear();
  updatePayloads.length = 0;
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } }, error: null });
  fromSpy.mockReset();
});

import { POST } from "./route";

const UNIQUE_URLS = {
  n8n_webhook_url_lead_qualified: "https://n8n.example.com/qualified",
  n8n_webhook_url_lead_escalated: "https://n8n.example.com/escalated",
  n8n_webhook_url_booking_created: "https://n8n.example.com/booking",
};


describe("POST /api/v1/automations/webhook", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: {} }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 400 when businessId is missing", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(makeRequest({ webhookUrls: {} }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("businessId is required");
  });

  it("returns 400 when webhookUrls is missing", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(makeRequest({ businessId: "biz" }));
    expect(res.status).toBe(400);
  });

  it("does not report a no-op save for a business hidden by RLS", async () => {
    fromSpy.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    });

    const res = await POST(makeRequest({ businessId: "other-org-business", webhookUrls: {} }));
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid webhook field name", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: { invalid_field: "https://example.com/webhook" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid URL protocol", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: { n8n_webhook_url_lead_qualified: "ftp://example.com/webhook" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("rejects short webhook signing secrets", async () => {
    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: {},
        webhookSecret: "too-short",
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 32 characters/);
  });

  it("saves a webhook signing secret without exposing it in the response", async () => {
    fromSpy.mockImplementation(() => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
        return { eq: successfulUpdate };
      },
    }));

    const secret = "0123456789abcdef0123456789abcdef";
    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: {}, webhookSecret: secret }));

    expect(res.status).toBe(200);
    expect(updatePayloads[0]).toEqual({ n8n_webhook_secret: secret });
    expect(await res.json()).toEqual({ saved: true });
  });

  it("saves all three URLs when provided", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: successfulUpdate }),
    });

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: UNIQUE_URLS }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saved).toBe(true);
  });

  it("AUTOMATION URL TEST: writes three unique URLs to their own columns in a single update", async () => {
    fromSpy.mockImplementation(() => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
        return { eq: successfulUpdate };
      },
    }));

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: UNIQUE_URLS }));

    expect(res.status).toBe(200);
    // Exactly one update, targeting all three per-event columns with
    // three DIFFERENT values — none collapsed into a shared column.
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toEqual({
      n8n_webhook_url_lead_qualified: "https://n8n.example.com/qualified",
      n8n_webhook_url_lead_escalated: "https://n8n.example.com/escalated",
      n8n_webhook_url_booking_created: "https://n8n.example.com/booking",
    });
    expect(new Set(Object.values(updatePayloads[0] as Record<string, string>)).size).toBe(3);
    // The legacy column must never be written.
    expect(updatePayloads[0]).not.toHaveProperty("n8n_webhook_url");
  });

  it("partial updates only touch the field being changed, so one URL cannot overwrite the others", async () => {
    fromSpy.mockImplementation(() => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
        return { eq: successfulUpdate };
      },
    }));

    const res = await POST(
      makeRequest({
        businessId: "biz",
        // Operator changes ONLY the booking webhook — the other two must be
        // untouched in the DB (absent from the update payload).
        webhookUrls: { n8n_webhook_url_booking_created: "https://n8n.example.com/new-booking" },
      })
    );

    expect(res.status).toBe(200);
    expect(updatePayloads).toHaveLength(1);
    expect(updatePayloads[0]).toEqual({ n8n_webhook_url_booking_created: "https://n8n.example.com/new-booking" });
    expect(updatePayloads[0]).not.toHaveProperty("n8n_webhook_url_lead_qualified");
    expect(updatePayloads[0]).not.toHaveProperty("n8n_webhook_url_lead_escalated");
    expect(updatePayloads[0]).not.toHaveProperty("n8n_webhook_url");
  });

  it("an empty-string field clears that event's URL (sets null) without touching the others", async () => {
    fromSpy.mockImplementation(() => ({
      update: (payload: unknown) => {
        updatePayloads.push(payload);
        return { eq: successfulUpdate };
      },
    }));

    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: { n8n_webhook_url_lead_escalated: "" },
      })
    );

    expect(res.status).toBe(200);
    expect(updatePayloads[0]).toEqual({ n8n_webhook_url_lead_escalated: null });
  });

  it("fails EXPLICITLY instead of silently collapsing all three URLs into the legacy column when the per-event columns are missing", async () => {
    fromSpy.mockReturnValue({
      update: () =>
        ({
          eq: () => ({
            select: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: null,
                  error: {
                    message:
                      "Could not find the 'n8n_webhook_url_lead_qualified' column of 'businesses' in the schema cache",
                  },
                }),
            }),
          }),
        }),
    });

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: UNIQUE_URLS }));

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/0008_three_webhook_urls\.sql/);
    // No second write to the legacy column: the reported bug was that saving
    // A/B/C wrote C into n8n_webhook_url, so after a reload all three fields
    // showed the Booking Created URL.
    expect(updatePayloads).toHaveLength(0);
  });

  it("returns the raw database error for other update failures", async () => {
    fromSpy.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: { message: "RLS violation" } }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: UNIQUE_URLS }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("RLS violation");
  });

  it("does not report success when RLS updates zero businesses", async () => {
    fromSpy.mockReturnValue({
      update: () => ({
        eq: () => ({
          select: () => ({
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
      }),
    });

    const res = await POST(makeRequest({ businessId: "other-org-business", webhookUrls: UNIQUE_URLS }));
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe("Business not found");
  });
});
