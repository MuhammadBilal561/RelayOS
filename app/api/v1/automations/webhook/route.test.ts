import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fromSpy = vi.fn();
const getUserMock = vi.fn();

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
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1", email: "test@example.com" } }, error: null });
});

import { POST } from "./route";

describe("POST /api/v1/automations/webhook", () => {
  it("returns 401 when not authenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    fromSpy.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    const res = await POST(makeRequest({ businessId: "biz", webhookUrls: {} }));

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Not authenticated");
  });

  it("returns 400 when businessId is missing", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    const res = await POST(makeRequest({ webhookUrls: {} }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("businessId is required");
  });

  it("returns 400 when webhookUrls is missing", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    const res = await POST(makeRequest({ businessId: "biz" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid webhook field name", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
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
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: { n8n_webhook_url_lead_qualified: "ftp://example.com/webhook" },
      })
    );
    expect(res.status).toBe(400);
  });

  it("saves all three URLs when provided", async () => {
    fromSpy.mockReturnValue({
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    });

    const res = await POST(
      makeRequest({
        businessId: "biz",
        webhookUrls: {
          n8n_webhook_url_lead_qualified: "https://n8n.example.com/qualified",
          n8n_webhook_url_lead_escalated: "https://n8n.example.com/escalated",
          n8n_webhook_url_booking_created: "https://n8n.example.com/booking",
        },
      })
    );
    expect(res.status).toBe(200);
  });
});