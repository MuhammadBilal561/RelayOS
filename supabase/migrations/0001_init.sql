-- RelayOS — Phase 0/1 schema
-- Run this in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh free-tier project. Safe to re-run: guarded with IF NOT EXISTS.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tenancy
-- ---------------------------------------------------------------------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role text not null default 'owner' check (role in ('owner', 'staff', 'agency_admin')),
  created_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  industry text,
  timezone text not null default 'UTC',
  public_widget_key text not null unique default encode(gen_random_bytes(16), 'hex'),
  brand_color text not null default '#F2A93B',
  system_persona text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Knowledge base / RAG
-- ---------------------------------------------------------------------
create table if not exists kb_documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  title text not null,
  source_type text not null default 'manual',
  content_text text not null,
  created_at timestamptz not null default now()
);

-- 768 dims matches Gemini's text-embedding-004 output size.
create table if not exists kb_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references kb_documents (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  chunk_text text not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create index if not exists kb_chunks_embedding_idx
  on kb_chunks using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------
-- Leads, conversations, messages
-- ---------------------------------------------------------------------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  -- Anonymous visitor identifier generated client-side by the widget
  -- (see public/embed.js) so the same browser session maps back to the
  -- same lead/conversation before we know their name or email.
  visitor_session_id text,
  name text,
  email text,
  phone text,
  source text not null default 'widget',
  score int not null default 0,
  status text not null default 'new'
    check (status in ('new', 'qualified', 'booked', 'nurturing', 'escalated', 'lost')),
  created_at timestamptz not null default now()
);

create unique index if not exists leads_business_session_idx
  on leads (business_id, visitor_session_id)
  where visitor_session_id is not null;

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  channel text not null default 'widget' check (channel in ('widget', 'email')),
  status text not null default 'open' check (status in ('open', 'closed', 'escalated')),
  summary_text text,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  role text not null check (role in ('visitor', 'assistant', 'staff', 'system')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Row Level Security — every dashboard-facing table is scoped to the
-- caller's organization via the users table. The widget endpoint does
-- NOT use these policies; it authenticates via public_widget_key and
-- writes through the service-role key instead (see lib/supabase/server.ts).
-- ---------------------------------------------------------------------
alter table organizations enable row level security;
alter table users enable row level security;
alter table businesses enable row level security;
alter table kb_documents enable row level security;
alter table kb_chunks enable row level security;
alter table leads enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create or replace function auth_organization_id()
returns uuid
language sql
stable
as $$
  select organization_id from users where id = auth.uid()
$$;

create policy "org members can read their org" on organizations
  for select using (id = auth_organization_id());

create policy "users can read their org's users" on users
  for select using (organization_id = auth_organization_id());

create policy "org members can manage their businesses" on businesses
  for all using (organization_id = auth_organization_id());

create policy "org members can manage their kb documents" on kb_documents
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );

create policy "org members can read their kb chunks" on kb_chunks
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );

create policy "org members can manage their leads" on leads
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );

create policy "org members can manage their conversations" on conversations
  for all using (
    business_id in (select id from businesses where organization_id = auth_organization_id())
  );

create policy "org members can manage their messages" on messages
  for all using (
    conversation_id in (
      select c.id from conversations c
      join businesses b on b.id = c.business_id
      where b.organization_id = auth_organization_id()
    )
  );

-- ---------------------------------------------------------------------
-- Semantic search RPC used by lib/rag/retrieve.ts
-- ---------------------------------------------------------------------
create or replace function match_kb_chunks(
  p_business_id uuid,
  p_query_embedding vector(768),
  p_match_count int default 5
)
returns table (id uuid, chunk_text text, similarity float)
language sql
stable
as $$
  select
    kb_chunks.id,
    kb_chunks.chunk_text,
    1 - (kb_chunks.embedding <=> p_query_embedding) as similarity
  from kb_chunks
  where kb_chunks.business_id = p_business_id
  order by kb_chunks.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- Seed one demo organization + business so the widget has something to
-- talk about immediately after setup. Safe to delete once you add your own.
insert into organizations (id, name, plan)
values ('00000000-0000-0000-0000-000000000001', 'Demo Agency', 'free')
on conflict (id) do nothing;

insert into businesses (id, organization_id, name, industry, public_widget_key, brand_color, system_persona)
values (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Aurora HVAC & Air',
  'Home services — HVAC',
  'demo-widget-key',
  '#F2A93B',
  'You are the front-desk assistant for Aurora HVAC & Air, a residential HVAC company. Be warm, concise, and to the point.'
)
on conflict (id) do nothing;

-- A starter knowledge-base document so the demo widget has something
-- grounded to answer with immediately. Ingest it for real (with
-- embeddings) via the dashboard's Knowledge Base page after setup —
-- this row alone is not enough for RAG retrieval since it has no
-- matching kb_chunks/embeddings yet.
insert into kb_documents (business_id, title, source_type, content_text)
values (
  '00000000-0000-0000-0000-000000000002',
  'Services & Pricing (starter)',
  'manual',
  'Aurora HVAC & Air offers AC repair (from $89 diagnostic + parts), full system installs (free on-site quote), and annual maintenance plans ($199/year, includes 2 tune-ups). Standard service hours are Mon-Sat 8am-6pm; emergency after-hours calls have a $75 dispatch fee. We service all major brands and offer financing on installs over $3,000.'
)
on conflict do nothing;
