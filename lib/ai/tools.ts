import { Type, type FunctionDeclaration } from "@google/genai";
import { checkAvailability, createCalendarEvent } from "@/lib/google-calendar";
import { summarizeConversation } from "@/lib/ai/summarize";
import { emitAutomationEvent } from "@/lib/automation-events";
import { updateLead, updateConversation, insertBooking, getLeadById, getConversationHistory } from "@/lib/server-data";

/**
 * Tool declarations given to Gemini. This is the entire surface area of
 * what the agent is allowed to *do* (as opposed to say) — every action
 * is an explicit, server-validated function, never a free-form DB write.
 */
export const agentTools: FunctionDeclaration[] = [
  {
    name: "capture_lead_info",
    description:
      "Save or update the visitor's contact details and what they're interested in. Call this as soon as the visitor shares any one of these fields — don't wait to collect all of them.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "The visitor's name" },
        email: { type: Type.STRING, description: "The visitor's email address" },
        phone: { type: Type.STRING, description: "The visitor's phone number" },
        service_interest: {
          type: Type.STRING,
          description: "A short summary of what the visitor is asking about, e.g. 'AC repair quote'",
        },
      },
    },
  },
  {
    name: "check_availability",
    description:
      "Check whether a specific date/time is open on the business's calendar before offering to book it. Always call this before create_booking — never assume a time is free.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        proposed_start_iso: {
          type: Type.STRING,
          description: "The visitor's requested start time as an ISO 8601 datetime, e.g. '2026-08-03T15:00:00-05:00'",
        },
        duration_minutes: { type: Type.NUMBER, description: "Appointment length in minutes. Default 30." },
      },
      required: ["proposed_start_iso"],
    },
  },
  {
    name: "create_booking",
    description:
      "Book the appointment once the visitor has confirmed a specific available time (from check_availability) and you have their name and email. This creates a real calendar event.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        start_iso: { type: Type.STRING, description: "Confirmed start time as ISO 8601" },
        duration_minutes: { type: Type.NUMBER, description: "Appointment length in minutes. Default 30." },
        summary: { type: Type.STRING, description: "Short calendar event title, e.g. 'AC repair quote — Jane Doe'" },
      },
      required: ["start_iso", "summary"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Flag this conversation for a human team member to take over — use for frustrated visitors, explicit requests for a human, or questions the knowledge base can't answer.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        reason: { type: Type.STRING, description: "One short sentence explaining why this needs a human" },
      },
      required: ["reason"],
    },
  },
];

interface ToolContext {
  businessId: string;
  leadId: string;
  conversationId: string;
}

/**
 * Executes a tool call the model requested and returns the structured
 * result that gets sent back to the model as a functionResponse. Keep
 * this the single place that translates "agent intent" into database
 * writes, so it stays auditable (see audit_log in the full architecture).
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<Record<string, unknown>> {
  switch (name) {
    case "capture_lead_info": {
      const update: Record<string, unknown> = {};
      if (args.name) update.name = args.name;
      if (args.email) update.email = args.email;
      if (args.phone) update.phone = args.phone;
      if (args.service_interest) update.service_interest = args.service_interest;

      if (Object.keys(update).length > 0) {
        const lead = await getLeadById(ctx.leadId);
        const wasNew = lead?.status === "new";

        update.status = "qualified";
        await updateLead(ctx.leadId, update as any);

        // Only fire the automation on the *first* qualification, not on
        // every subsequent field capture in the same conversation.
        if (wasNew) {
          await emitAutomationEvent(ctx.businessId, "lead.qualified", { leadId: ctx.leadId, ...update });
        }
      }
      return { saved: Object.keys(update) };
    }

    case "check_availability": {
      const proposedStartIso = args.proposed_start_iso as string | undefined;
      if (!proposedStartIso) return { error: "proposed_start_iso is required" };
      const durationMinutes = typeof args.duration_minutes === "number" ? args.duration_minutes : 30;

      const result = await checkAvailability(ctx.businessId, proposedStartIso, durationMinutes);
      if (!result.connected) {
        return { connected: false, message: "This business hasn't connected a calendar yet — offer to have a human follow up instead." };
      }
      return result.available
        ? { connected: true, available: true }
        : { connected: true, available: false, suggested_start_iso: result.suggestedStartIso };
    }

    case "create_booking": {
      const startIso = args.start_iso as string | undefined;
      const summary = (args.summary as string | undefined) ?? "RelayOS booking";
      if (!startIso) return { error: "start_iso is required" };
      const durationMinutes = typeof args.duration_minutes === "number" ? args.duration_minutes : 30;
      const endIso = new Date(new Date(startIso).getTime() + durationMinutes * 60_000).toISOString();

      // Hard safety guard: never book a slot we haven't confirmed is free.
      // The system prompt tells the model to call check_availability first,
      // but this backend check is the final line of defense against
      // double-booking even if the model skips it.
      const availability = await checkAvailability(ctx.businessId, startIso, durationMinutes);
      if (!availability.connected) {
        return { booked: false, message: "This business hasn't connected a calendar yet — offer a human follow-up instead." };
      }
      if (!availability.available) {
        return {
          booked: false,
          available: false,
          suggested_start_iso: availability.suggestedStartIso,
          message: "That time is no longer available. Offer the suggested alternative below.",
        };
      }

      const lead = await getLeadById(ctx.leadId);

      const eventId = await createCalendarEvent(ctx.businessId, {
        startIso,
        endIso,
        summary,
        attendeeEmail: lead?.email ?? undefined,
      });

      if (!eventId) {
        return { booked: false, message: "This business hasn't connected a calendar yet — offer a human follow-up instead." };
      }

      const bookingId = await insertBooking({
        lead_id: ctx.leadId,
        business_id: ctx.businessId,
        start_time: startIso,
        end_time: endIso,
        calendar_event_id: eventId,
      });
      await updateLead(ctx.leadId, { status: "booked" });

      await emitAutomationEvent(ctx.businessId, "booking.created", {
        bookingId,
        leadId: ctx.leadId,
        leadEmail: lead?.email ?? null,
        startIso,
        endIso,
        summary,
      });

      return { booked: true, start_iso: startIso };
    }

    case "escalate_to_human": {
      const transcriptMessages = await getConversationHistory(ctx.conversationId);

      const summary = await summarizeConversation(transcriptMessages);

      await updateLead(ctx.leadId, { status: "escalated" });
      await updateConversation(ctx.conversationId, { status: "escalated", summary_text: summary });

      await emitAutomationEvent(ctx.businessId, "lead.escalated", {
        leadId: ctx.leadId,
        conversationId: ctx.conversationId,
        reason: args.reason ?? "Not specified",
        summary,
      });

      return { escalated: true, reason: args.reason ?? "Not specified", summary };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
