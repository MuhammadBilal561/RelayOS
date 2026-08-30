-- RelayOS — Phase 3: lead intelligence
-- Run this after 0001_init.sql and 0002_bookings.sql.

alter table leads add column if not exists service_interest text;
alter table leads add column if not exists last_scored_at timestamptz;

create index if not exists leads_business_score_idx on leads (business_id, score desc);
