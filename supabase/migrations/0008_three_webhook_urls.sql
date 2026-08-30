-- RelayOS — Phase 6: three independent n8n webhook URLs per business
-- Run this after 0001_init.sql, 0002_bookings.sql, 0003_lead_scoring.sql,
-- 0004_automation_events.sql, 0005_analytics_and_agency.sql, 0006_fix_users_rls.sql,
-- and 0007_performance_indexes.sql.
--
-- The legacy n8n_webhook_url column is intentionally preserved for backward
-- compatibility. It will be deprecated in a future migration once all
-- existing deployments have migrated to the per-event URLs.

alter table businesses
  add column if not exists n8n_webhook_url_lead_qualified text;

comment on column businesses.n8n_webhook_url_lead_qualified is
  'n8n webhook URL for the lead.qualified event. '
  'If null, the lead.qualified event will not be delivered via webhook.';

alter table businesses
  add column if not exists n8n_webhook_url_lead_escalated text;

comment on column businesses.n8n_webhook_url_lead_escalated is
  'n8n webhook URL for the lead.escalated event. '
  'If null, the lead.escalated event will not be delivered via webhook.';

alter table businesses
  add column if not exists n8n_webhook_url_booking_created text;

comment on column businesses.n8n_webhook_url_booking_created is
  'n8n webhook URL for the booking.created event. '
  'If null, the booking.created event will not be delivered via webhook.';