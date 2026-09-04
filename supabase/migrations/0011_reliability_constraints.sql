-- Prevent concurrent widget requests from creating multiple open conversations
-- for the same lead. The application retries the unique violation by reading
-- the row created by the concurrent request.
create unique index if not exists conversations_one_open_per_lead_idx
  on conversations (lead_id)
  where status = 'open';

-- A calendar event must map to at most one local booking per business.
create unique index if not exists bookings_business_calendar_event_idx
  on bookings (business_id, calendar_event_id)
  where calendar_event_id is not null;
