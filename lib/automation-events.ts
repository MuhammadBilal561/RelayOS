import { createServiceRoleClient } from "@/lib/supabase/server";

export type AutomationEventType = "lead.qualified" | "lead.escalated" | "booking.created";

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

    const { data: business } = await supabase
      .from("businesses")
      .select("n8n_webhook_url")
      .eq("id", businessId)
      .single();

    if (!business?.n8n_webhook_url) return; // no automation configured — nothing more to do

    try {
      const res = await fetch(business.n8n_webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: eventType,
          business_id: businessId,
          payload,
          occurred_at: new Date().toISOString(),
        }),
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
