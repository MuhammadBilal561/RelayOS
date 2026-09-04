-- Backfill event-specific webhook URLs for databases that already applied
-- 0008 before its legacy-data backfill was introduced.
--
-- This is intentionally a one-time migration. Once these columns exist,
-- explicit NULL means that event is disabled and must not fall back to the
-- legacy URL.
update businesses
set
  n8n_webhook_url_lead_qualified = coalesce(n8n_webhook_url_lead_qualified, n8n_webhook_url),
  n8n_webhook_url_lead_escalated = coalesce(n8n_webhook_url_lead_escalated, n8n_webhook_url),
  n8n_webhook_url_booking_created = coalesce(n8n_webhook_url_booking_created, n8n_webhook_url)
where n8n_webhook_url is not null;
