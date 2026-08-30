-- RelayOS — Phase 4: automation events
-- Run this after 0001_init.sql, 0002_bookings.sql, and 0003_lead_scoring.sql.

alter table businesses add column if not exists n8n_webhook_url text;

create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  delivery_error text,
  created_at timestamptz not null default now()
);

create index if not exists automation_events_business_created_idx
  on automation_events (business_id, created_at desc);

alter table automation_events enable row level security;

create policy "org members can read their automation events" on automation_events
  for select using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );
