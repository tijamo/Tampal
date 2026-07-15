-- =============================================================================
-- Data retention (GDPR storage limitation, Article 5(1)(e))
--
-- Two scheduled jobs, run daily via pg_cron:
--   1. Strip contact details from visitors with no attendance in the retention
--      window (default 24 months). Their name/type stays for historical counts.
--   2. Hard-delete people that were soft-deleted (erased) more than 30 days ago,
--      giving a short grace window to reverse accidental erasures.
--
-- Both functions are SECURITY DEFINER so the scheduler can run them without a
-- user session; they are NOT exposed to the API.
-- =============================================================================

create or replace function purge_stale_visitor_contacts(retention_months int default 24)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with stale as (
    select p.id
    from people p
    where p.person_type = 'visitor'
      and p.deleted_at is null
      and (p.email is not null or p.phone is not null or p.address_line1 is not null)
      and not exists (
        select 1 from attendance a
        where a.person_id = p.id
          and a.occurrence_date > (current_date - make_interval(months => retention_months))
      )
      and p.created_at < (now() - make_interval(months => retention_months))
  )
  update people p
     set email = null, phone = null, address_line1 = null,
         address_line2 = null, city = null, postcode = null
    from stale
   where p.id = stale.id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function purge_erased_people(grace_days int default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  delete from people
   where deleted_at is not null
     and deleted_at < (now() - make_interval(days => grace_days));
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Schedule daily at 02:15 UTC. Requires the pg_cron extension (enable in the
-- Supabase dashboard under Database -> Extensions, or it is created here).
create extension if not exists pg_cron;

select cron.schedule(
  'tamfam-purge-visitor-contacts',
  '15 2 * * *',
  $$ select purge_stale_visitor_contacts(); $$
);

select cron.schedule(
  'tamfam-purge-erased-people',
  '30 2 * * *',
  $$ select purge_erased_people(); $$
);
