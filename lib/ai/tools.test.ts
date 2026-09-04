import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock every external boundary the tool layer touches -------------------
// executeTool() is the single place agent intent becomes a database write or
// a real Google Calendar event, so these tests exercise it against fakes
// rather than a live Supabase project or the real Calendar API.

const h = vi.hoisted(() => {
  const getLeadByIdMock = vi.fn();
  const updateLeadMock = vi.fn();
  const insertBookingMock = vi.fn();
  const updateConversationMock = vi.fn();
  const getConversationHistoryMock = vi.fn();
  
  return {
    getLeadByIdMock,
    updateLeadMock,
    insertBookingMock,
    updateConversationMock,
    getConversationHistoryMock,
  };
});

vi.mock("@/lib/server-data", () => ({
  getLeadById: h.getLeadByIdMock,
  updateLead: h.updateLeadMock,
  insertBooking: h.insertBookingMock,
  updateConversation: h.updateConversationMock,
  getConversationHistory: h.getConversationHistoryMock,
}));

vi.mock("@/lib/google-calendar", () => ({
  checkAvailability: vi.fn(),
  createCalendarEvent: vi.fn(),
}));

vi.mock("@/lib/ai/summarize", () => ({
  summarizeConversation: vi.fn(async () => "Visitor asked about AC repair pricing and wants a callback."),
}));

vi.mock("@/lib/automation-events", () => ({
  emitAutomationEvent: vi.fn(async () => {}),
}));

import { executeTool } from "@/lib/ai/tools";
import { checkAvailability, createCalendarEvent } from "@/lib/google-calendar";
import { summarizeConversation } from "@/lib/ai/summarize";
import { emitAutomationEvent } from "@/lib/automation-events";

const ctx = { businessId: "biz_1", leadId: "lead_1", conversationId: "conv_1" };

beforeEach(() => {
  h.getLeadByIdMock.mockReset();
  h.updateLeadMock.mockReset();
  h.insertBookingMock.mockReset();
  h.updateConversationMock.mockReset();
  h.getConversationHistoryMock.mockReset();
  vi.mocked(checkAvailability).mockReset();
  vi.mocked(createCalendarEvent).mockReset();
  vi.mocked(summarizeConversation).mockClear();
  vi.mocked(emitAutomationEvent).mockClear();
});

describe("executeTool: capture_lead_info", () => {
  it("saves whichever fields were provided and marks the lead qualified", async () => {
    h.getLeadByIdMock.mockResolvedValue({ status: "new" });
    h.updateLeadMock.mockResolvedValue(undefined);

    const result = await executeTool("capture_lead_info", { email: "jane@example.com" }, ctx);

    expect(h.getLeadByIdMock).toHaveBeenCalledWith(ctx.leadId);
    expect(h.updateLeadMock).toHaveBeenCalledWith(ctx.leadId, expect.objectContaining({ email: "jane@example.com", status: "qualified" }));
    expect(result.saved).toEqual(["email", "status"]);
  });

  it("saves service_interest when provided", async () => {
    h.getLeadByIdMock.mockResolvedValue({ status: "new" });
    h.updateLeadMock.mockResolvedValue(undefined);

    const result = await executeTool(
      "capture_lead_info",
      { name: "Jane", service_interest: "AC repair" },
      ctx
    );
    expect(result.saved).toContain("service_interest");
  });

  it("writes nothing and reports no saved fields when the model calls it with no arguments", async () => {
    const result = await executeTool("capture_lead_info", {}, ctx);
    expect(result.saved).toEqual([]);
  });

  it("fires lead.qualified the first time a brand-new lead is qualified", async () => {
    h.getLeadByIdMock.mockResolvedValue({ status: "new" });
    h.updateLeadMock.mockResolvedValue(undefined);

    await executeTool("capture_lead_info", { email: "jane@example.com" }, ctx);

    expect(emitAutomationEvent).toHaveBeenCalledWith(
      ctx.businessId,
      "lead.qualified",
      expect.objectContaining({ leadId: ctx.leadId })
    );
  });

  it("does not re-fire lead.qualified for a lead that was already qualified", async () => {
    h.getLeadByIdMock.mockResolvedValue({ status: "qualified" });
    h.updateLeadMock.mockResolvedValue(undefined);
    await executeTool("capture_lead_info", { phone: "555-0100" }, ctx);

    expect(emitAutomationEvent).not.toHaveBeenCalled();
  });
});

describe("executeTool: check_availability", () => {
  it("returns an error when the model omits the required proposed_start_iso", async () => {
    const result = await executeTool("check_availability", {}, ctx);
    expect(result.error).toBeDefined();
    expect(checkAvailability).not.toHaveBeenCalled();
  });

  it("reports the calendar as unconnected without leaking implementation details for the agent to repeat", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({ connected: false, available: false });
    const result = await executeTool("check_availability", { proposed_start_iso: "2026-08-03T15:00:00-05:00" }, ctx);

    expect(result.connected).toBe(false);
    expect(result.message).toBeDefined();
  });

  it("passes through an available slot", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({ connected: true, available: true });
    const result = await executeTool("check_availability", { proposed_start_iso: "2026-08-03T15:00:00-05:00" }, ctx);

    expect(result).toEqual({ connected: true, available: true });
  });

  it("surfaces a suggested alternative time when the requested slot is busy", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({
      connected: true,
      available: false,
      suggestedStartIso: "2026-08-03T15:30:00-05:00",
    });
    const result = await executeTool("check_availability", { proposed_start_iso: "2026-08-03T15:00:00-05:00" }, ctx);

    expect(result.available).toBe(false);
    expect(result.suggested_start_iso).toBe("2026-08-03T15:30:00-05:00");
  });

  it("defaults duration to 30 minutes when the model doesn't specify one", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({ connected: true, available: true });
    await executeTool("check_availability", { proposed_start_iso: "2026-08-03T15:00:00-05:00" }, ctx);

    expect(checkAvailability).toHaveBeenCalledWith(ctx.businessId, "2026-08-03T15:00:00-05:00", 30);
  });
});

describe("executeTool: create_booking", () => {
  beforeEach(() => {
    // The hard safety guard calls checkAvailability before booking; default
    // it to available so the happy-path tests exercise the booking logic.
    vi.mocked(checkAvailability).mockResolvedValue({ connected: true, available: true });
    h.getLeadByIdMock.mockResolvedValue({ email: "jane@example.com" });
    h.updateLeadMock.mockResolvedValue(undefined);
    h.insertBookingMock.mockResolvedValue("booking_1");
  });

  it("requires start_iso", async () => {
    const result = await executeTool("create_booking", { summary: "AC repair" }, ctx);
    expect(result.error).toBeDefined();
    expect(createCalendarEvent).not.toHaveBeenCalled();
  });

  it("refuses to book a slot that is no longer available (hard safety guard)", async () => {
    vi.mocked(checkAvailability).mockResolvedValue({
      connected: true,
      available: false,
      suggestedStartIso: "2026-08-03T15:30:00-05:00",
    });

    const result = await executeTool(
      "create_booking",
      { start_iso: "2026-08-03T15:00:00-05:00", summary: "AC repair" },
      ctx
    );

    expect(result.booked).toBe(false);
    expect(result.available).toBe(false);
    expect(result.suggested_start_iso).toBe("2026-08-03T15:30:00-05:00");
    // Must NOT create a calendar event or write a bookings row for a slot
    // that was never confirmed free — this is the anti-double-booking guard.
    expect(createCalendarEvent).not.toHaveBeenCalled();
    expect(h.insertBookingMock).not.toHaveBeenCalled();
    expect(emitAutomationEvent).not.toHaveBeenCalled();
  });

  it("books the appointment, records it, and marks the lead booked when the calendar is connected", async () => {
    vi.mocked(createCalendarEvent).mockResolvedValue("gcal_event_123");

    const result = await executeTool(
      "create_booking",
      { start_iso: "2026-08-03T15:00:00-05:00", summary: "AC repair — Jane" },
      ctx
    );

    expect(createCalendarEvent).toHaveBeenCalledWith(
      ctx.businessId,
      expect.objectContaining({
        startIso: "2026-08-03T15:00:00-05:00",
        summary: "AC repair — Jane",
        attendeeEmail: "jane@example.com",
      })
    );
    expect(h.insertBookingMock).toHaveBeenCalledWith(expect.objectContaining({ lead_id: ctx.leadId, business_id: ctx.businessId }));
    expect(h.updateLeadMock).toHaveBeenCalledWith(ctx.leadId, { status: "booked" });
    expect(result.booked).toBe(true);
    expect(emitAutomationEvent).toHaveBeenCalledWith(
      ctx.businessId,
      "booking.created",
      expect.objectContaining({ bookingId: "booking_1", leadId: ctx.leadId })
    );
  });

  it("does not silently claim success when the business has no calendar connected", async () => {
    vi.mocked(createCalendarEvent).mockResolvedValue(null);

    const result = await executeTool(
      "create_booking",
      { start_iso: "2026-08-03T15:00:00-05:00", summary: "AC repair" },
      ctx
    );

    expect(result.booked).toBe(false);
    // Must not have written a bookings row for an event that doesn't exist,
    // and must not fire an automation event for a booking that never happened.
    expect(h.insertBookingMock).not.toHaveBeenCalled();
    expect(emitAutomationEvent).not.toHaveBeenCalled();
  });

  it("BOOKING AUTOMATION TEST: never reports booked:true and never emits booking.created when the database insert fails", async () => {
    h.getLeadByIdMock.mockResolvedValue({ email: "jane@example.com" });
    vi.mocked(checkAvailability).mockResolvedValue({ connected: true, available: true });
    vi.mocked(createCalendarEvent).mockResolvedValue("gcal_event_789");
    h.insertBookingMock.mockRejectedValue(new Error("Failed to insert booking: connection terminated"));
    h.updateLeadMock.mockResolvedValue(undefined);

    await expect(
      executeTool("create_booking", { start_iso: "2026-08-03T15:00:00-05:00", summary: "AC repair" }, ctx)
    ).rejects.toThrow(/Failed to insert booking/);

    // The lead must not be marked booked, and no automation event may fire
    // for a booking that was never persisted.
    expect(h.updateLeadMock).not.toHaveBeenCalledWith(ctx.leadId, { status: "booked" });
    expect(emitAutomationEvent).not.toHaveBeenCalled();
  });

  it("computes end_time from start_iso + duration_minutes", async () => {
    h.getLeadByIdMock.mockResolvedValue({ email: null });
    vi.mocked(createCalendarEvent).mockResolvedValue("gcal_event_456");

    await executeTool(
      "create_booking",
      { start_iso: "2026-08-03T15:00:00.000Z", duration_minutes: 45, summary: "Consult" },
      ctx
    );

    expect(createCalendarEvent).toHaveBeenCalledWith(
      ctx.businessId,
      expect.objectContaining({ endIso: "2026-08-03T15:45:00.000Z" })
    );
  });
});

describe("executeTool: escalate_to_human", () => {
  it("generates and stores an AI summary so a human has context on handoff", async () => {
    h.getConversationHistoryMock.mockResolvedValue([
      { role: "visitor", content: "My AC broke, can someone come today?" },
      { role: "assistant", content: "Let me get a human to help schedule that." },
    ]);
    h.updateLeadMock.mockResolvedValue(undefined);
    h.updateConversationMock.mockResolvedValue(undefined);

    const result = await executeTool("escalate_to_human", { reason: "Same-day service request" }, ctx);

    expect(summarizeConversation).toHaveBeenCalled();
    expect(result.escalated).toBe(true);
    expect(result.summary).toBe("Visitor asked about AC repair pricing and wants a callback.");
    expect(h.updateConversationMock).toHaveBeenCalledWith(ctx.conversationId, expect.objectContaining({ status: "escalated" }));
    expect(h.updateLeadMock).toHaveBeenCalledWith(ctx.leadId, { status: "escalated" });
    expect(emitAutomationEvent).toHaveBeenCalledWith(
      ctx.businessId,
      "lead.escalated",
      expect.objectContaining({ leadId: ctx.leadId, reason: "Same-day service request" })
    );
  });

  it("still escalates even if no reason was given", async () => {
    h.getConversationHistoryMock.mockResolvedValue([]);
    h.updateLeadMock.mockResolvedValue(undefined);
    h.updateConversationMock.mockResolvedValue(undefined);

    const result = await executeTool("escalate_to_human", {}, ctx);
    expect(result.escalated).toBe(true);
    expect(result.reason).toBe("Not specified");
  });
});

describe("executeTool: unknown tool", () => {
  it("returns an error instead of throwing, so a malformed model response can't crash the request", async () => {
    const result = await executeTool("delete_everything", {}, ctx);
    expect(result.error).toContain("Unknown tool");
  });
});
