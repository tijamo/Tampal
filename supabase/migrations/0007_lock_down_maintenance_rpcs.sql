-- =============================================================================
-- Lock down the retention/erasure maintenance functions.
--
-- purge_stale_visitor_contacts() and purge_erased_people() are SECURITY
-- DEFINER and documented (0002_retention.sql) as "NOT exposed to the API" --
-- meant to run only via pg_cron. But CREATE FUNCTION grants EXECUTE to
-- PUBLIC by default, and Supabase's PostgREST layer exposes every public-
-- schema function as an RPC endpoint, so any authenticated user could call
-- them directly: force an early hard-delete of soft-deleted people (skipping
-- the 30-day recovery grace window) or an early contact-detail purge on
-- visitors. Revoke PUBLIC/authenticated execute so only the cron job (which
-- runs as the function owner) can call them, matching the original intent.
-- =============================================================================

revoke all on function purge_stale_visitor_contacts(int) from public;
revoke all on function purge_erased_people(int) from public;
