-- RelayOS — Phase 5: revenue-recovery analytics + agency mode
-- Run this after 0001–0004.
--
-- Multi-tenant business switching (Phase 5's agency mode) needs no schema
-- change — businesses were scoped to organizations from Phase 0 onward.
-- The only new column is the $ value an owner assigns to an average
-- booking, which is what turns a booking count into a "revenue recovered"
-- number instead of a vanity metric.

alter table businesses add column if not exists avg_job_value numeric(10, 2);
