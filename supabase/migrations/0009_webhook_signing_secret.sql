-- RelayOS — Webhook HMAC signing secret per business
-- Run this after 0008_three_webhook_urls.sql.

alter table businesses
  add column if not exists n8n_webhook_secret text;

comment on column businesses.n8n_webhook_secret is
  'HMAC-SHA256 secret for signing n8n webhook requests. '
  'If null, webhooks will be sent unsigned (not recommended for production). '
  'Generate with: openssl rand -hex 32';