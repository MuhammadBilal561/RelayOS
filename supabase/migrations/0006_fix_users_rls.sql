-- Fix: Allow users to read their own record to break the circular RLS dependency
-- This allows auth_organization_id() to work properly

drop policy if exists "users can read their org's users" on users;

create policy "users can read their own record" on users
  for select using (id = auth.uid());

create policy "users can read their org's users" on users
  for select using (organization_id = auth_organization_id() and id != auth.uid());
