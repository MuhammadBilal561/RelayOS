-- RelayOS — Phase 2: calendar connections + bookings
-- Run this after 0001_init.sql.

create table if not exists calendar_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade unique,
  provider text not null default 'google',
  -- Tokens are stored as-is for Phase 2 scaffold simplicity. Before a real
  -- client deployment, encrypt these at rest — e.g. with Supabase Vault
  -- (pgsodium) or by encrypting in application code before insert.
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  calendar_id text not null default 'primary',
  connected_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'no_show')),
  calendar_event_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bookings_business_start_idx on bookings (business_id, start_time);

alter table calendar_connections enable row level security;
alter table bookings enable row level security;

create policy "org members can manage their calendar connection" on calendar_connections
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );

create policy "org members can manage their bookings" on bookings
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );
