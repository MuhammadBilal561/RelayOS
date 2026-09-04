import { createServiceRoleClient } from "@/lib/supabase/server";
import { signWebhookRequest } from "@/lib/webhook-signing";
import { isMissingColumnError } from "@/lib/automation-webhooks";

export type AutomationEventType = "lead.qualified" | "lead.escalated" | "booking.created";

const WEBHOOK_URL_COLUMN: Record<AutomationEventType, string> = {
  "lead.qualified": "n8n_webhook_url_lead_qualified",
  "lead.escalated": "n8n_webhook_url_lead_escalated",
  "booking.created": "n8n_webhook_url_booking_created",
};

const WEBHOOK_SECRET_COLUMN = "n8n_webhook_secret";
type WebhookConfigRow = Record<string, string | null>;

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
    const row = await loadWebhookConfig(supabase, businessId, column);
    if (!row) return;

    // An explicit NULL in the event column disables that event. The legacy
    // column is only used by loadWebhookConfig for pre-0008 schemas.
    const hasEventUrlColumn = Object.prototype.hasOwnProperty.call(row, column);
    const webhookUrl = hasEventUrlColumn ? row[column]?.trim() || null : row.n8n_webhook_url?.trim() || null;
    const webhookSecret = row[WEBHOOK_SECRET_COLUMN]?.trim() || null;
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

    /**
     * Reads the event URL and signing secret together. If a deployment has not
     * applied one of the additive migrations yet, retry only the URL column before
     * falling back to the legacy URL. Other database errors must not be treated as
     * a migration problem: silently delivering to a legacy destination in that
     * case can route an event to the wrong workflow.
     */
    async function loadWebhookConfig(
      supabase: ReturnType<typeof createServiceRoleClient>,
      businessId: string,
      eventColumn: string
    ): Promise<WebhookConfigRow | null> {
      const selected = await supabase
        .from("businesses")
        .select(`${eventColumn}, ${WEBHOOK_SECRET_COLUMN}`)
        .eq("id", businessId)
        .single();

      if (!selected.error) return selected.data as unknown as WebhookConfigRow | null;
      if (!isMissingColumnError(selected.error)) {
        console.error("Failed to load automation webhook configuration:", selected.error.message, { businessId });
        return null;
      }

      const urlOnly = await supabase
        .from("businesses")
        .select(eventColumn)
        .eq("id", businessId)
        .single();
      if (!urlOnly.error) {
        // Migration 0009 is optional for existing installations. An absent secret
        // means unsigned delivery, but must not affect event URL routing.
        return { ...(urlOnly.data as unknown as WebhookConfigRow), [WEBHOOK_SECRET_COLUMN]: null };
      }

      if (!isMissingColumnError(urlOnly.error)) {
        console.error("Failed to load automation webhook URL:", urlOnly.error.message, { businessId, eventColumn });
        return null;
      }

      // Pre-migration-0008 schema: preserve delivery for legacy businesses.
      console.warn(
        `Could not read ${eventColumn}; falling back to legacy n8n_webhook_url. ` +
          "If this persists, run supabase/migrations/0008_three_webhook_urls.sql.",
        { eventType: eventColumn, businessId, reason: urlOnly.error.message }
      );
      const fallback = await supabase
        .from("businesses")
        .select("n8n_webhook_url")
        .eq("id", businessId)
        .single();
      if (fallback.error) {
        console.error("Failed to load legacy automation webhook URL:", fallback.error.message, { businessId });
        return null;
      }
      return { ...(fallback.data as unknown as WebhookConfigRow), [WEBHOOK_SECRET_COLUMN]: null };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const { error: deliveryUpdateError } = await supabase
        .from("automation_events")
        .update(res.ok ? { delivered_at: new Date().toISOString() } : { delivery_error: `HTTP ${res.status}` })
        .eq("id", event.id);
      if (deliveryUpdateError) {
        console.error("Failed to persist automation delivery result:", deliveryUpdateError.message, { eventId: event.id });
      }

      if (!res.ok) {
        // Log enough to debug (event type, business, destination host) without
        // ever logging the webhook secret or the full destination URL.
        console.error(
          `Automation delivery failed: event=${eventType} business=${businessId} destination=${safeHost(webhookUrl)} status=HTTP ${res.status}`
        );
      }
    } catch (deliveryErr) {
      clearTimeout(timeout);
      const detail = sanitizeDeliveryError(deliveryErr);
      const { error: deliveryUpdateError } = await supabase
        .from("automation_events")
        .update({ delivery_error: detail })
        .eq("id", event.id);
      if (deliveryUpdateError) {
        console.error("Failed to persist automation delivery error:", deliveryUpdateError.message, { eventId: event.id });
      }
      console.error(
        `Automation delivery failed: event=${eventType} business=${businessId} destination=${safeHost(webhookUrl)} error=${detail}`
      );
    }
  } catch (err) {
    // Belt-and-suspenders: even a bug in this function itself must not
    // propagate up and fail the widget response that triggered it.
    console.error("emitAutomationEvent failed unexpectedly:", err);
  }
}

/** Host of a webhook URL for diagnostics — never the path, query, or secret. */
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable-url";
  }
}

/** Keep provider errors useful without persisting a webhook URL or query secret. */
function sanitizeDeliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown delivery error";
  return message
    .replace(/https?:\/\/[^\s)]+/gi, "[destination]")
    .slice(0, 500);
}
