import { createServiceRoleClient } from "@/lib/supabase/server";
import { signWebhookRequest } from "@/lib/webhook-signing";

export type AutomationEventType = "lead.qualified" | "lead.escalated" | "booking.created";

const WEBHOOK_URL_COLUMN: Record<AutomationEventType, string> = {
  "lead.qualified": "n8n_webhook_url_lead_qualified",
  "lead.escalated": "n8n_webhook_url_lead_escalated",
  "booking.created": "n8n_webhook_url_booking_created",
};

const WEBHOOK_SECRET_COLUMN = "n8n_webhook_secret";

/**
 * Records an automation-worthy event and, if the business has configured
 * an n8n webhook URL (Settings → Automations), forwards it there so an
 * n8n workflow can Slack/email the owner, start a nurture sequence, etc.
 *
 * This is intentionally best-effort and never throws: a webhook being
 * slow or down must never break the widget's chat response. Every event
 * is still recorded in automation_events regardless of delivery outcome,
 * so nothing is silently lost — a failed delivery can be replayed later.
 */
export async function emitAutomationEvent(
  businessId: string,
  eventType: AutomationEventType,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const { data: event, error: insertError } = await supabase
      .from("automation_events")
      .insert({ business_id: businessId, event_type: eventType, payload })
      .select("id")
      .single();

    if (insertError || !event) {
      console.error(`Failed to record automation event ${eventType}:`, insertError?.message);
      return;
    }

    const column = WEBHOOK_URL_COLUMN[eventType];
    let { data: business, error: selectError } = await supabase
      .from("businesses")
      .select(`${column}, ${WEBHOOK_SECRET_COLUMN}`)
      .eq("id", businessId)
      .single();

    if (selectError) {
      const fallback = await supabase
        .from("businesses")
        .select("n8n_webhook_url")
        .eq("id", businessId)
        .single();
      business = fallback.data as typeof business;
    }

    const row = business as Record<string, string | null> | null;
    const webhookUrl = row?.[column] ?? row?.n8n_webhook_url ?? null;
    const webhookSecret = row?.[WEBHOOK_SECRET_COLUMN] ?? null;
    if (!webhookUrl) return; // no automation configured for this event type — nothing more to do

    const body = JSON.stringify({
      event_type: eventType,
      business_id: businessId,
      payload,
      occurred_at: new Date().toISOString(),
    });

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (webhookSecret) {
      const { signature, timestamp, nonce } = signWebhookRequest({ secret: webhookSecret, payload: body });
      headers["x-relayos-signature"] = signature;
      headers["x-relayos-timestamp"] = timestamp;
      headers["x-relayos-nonce"] = nonce;
    }

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
      });

      await supabase
        .from("automation_events")
        .update(res.ok ? { delivered_at: new Date().toISOString() } : { delivery_error: `HTTP ${res.status}` })
        .eq("id", event.id);
    } catch (deliveryErr) {
      await supabase
        .from("automation_events")
        .update({ delivery_error: deliveryErr instanceof Error ? deliveryErr.message : "Unknown delivery error" })
        .eq("id", event.id);
    }
  } catch (err) {
    // Belt-and-suspenders: even a bug in this function itself must not
    // propagate up and fail the widget response that triggered it.
    console.error("emitAutomationEvent failed unexpectedly:", err);
  }
}
