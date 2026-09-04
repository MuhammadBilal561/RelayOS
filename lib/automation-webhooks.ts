/**
 * Shared constants + helpers for the three per-event n8n webhook URLs.
 *
 * The businesses table has THREE event-specific webhook columns (added by
 * supabase/migrations/0008_three_webhook_urls.sql) plus one legacy
 * `n8n_webhook_url` column from before the per-event split. The explicit
 * backward-compatibility rule everywhere in this codebase is:
 *
 *   1. Writes ALWAYS target the per-event columns (never the legacy column —
 *      writing one URL to the legacy column would silently collapse three
 *      independent automations into one).
 *   2. Reads use the per-event value (including an explicit NULL); the legacy
 *      column is only used when the per-event columns do not exist yet
 *      (pre-0008 schema).
 */

export const WEBHOOK_URL_FIELDS = [
  "n8n_webhook_url_lead_qualified",
  "n8n_webhook_url_lead_escalated",
  "n8n_webhook_url_booking_created",
] as const;

export type WebhookUrlField = (typeof WEBHOOK_URL_FIELDS)[number];

export const LEGACY_WEBHOOK_URL_FIELD = "n8n_webhook_url";

/**
 * PostgREST reports missing columns with code 42703 ("column ... does not
 * exist") or a stale "schema cache" message right after a migration runs.
 * Both mean the per-event webhook columns are not queryable yet.
 */
export function isMissingColumnError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return /schema cache|does not exist|could not find/i.test(error.message ?? "");
}

/**
 * Resolves the three webhook URLs to show in Settings → Automations.
 * Explicit per-event NULL values remain disabled; the legacy column is only a
 * read-only fallback for rows from a pre-0008 schema.
 */
export function resolveAutomationWebhookUrls(
  row: Record<string, string | null> | null | undefined
): Record<WebhookUrlField, string> {
  const legacy = row?.[LEGACY_WEBHOOK_URL_FIELD] ?? "";
  const hasPerEventColumns = WEBHOOK_URL_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(row ?? {}, field)
  );
  return {
    n8n_webhook_url_lead_qualified: hasPerEventColumns
      ? row?.n8n_webhook_url_lead_qualified ?? ""
      : legacy,
    n8n_webhook_url_lead_escalated: hasPerEventColumns
      ? row?.n8n_webhook_url_lead_escalated ?? ""
      : legacy,
    n8n_webhook_url_booking_created: hasPerEventColumns
      ? row?.n8n_webhook_url_booking_created ?? ""
      : legacy,
  };
}
