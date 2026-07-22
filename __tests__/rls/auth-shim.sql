-- Minimal shim reproducing the parts of the Supabase platform bootstrap that
-- our migrations' RLS policies and GRANTs depend on: the `auth` schema
-- (auth.users, auth.uid(), auth.role()) and the anon/authenticated/
-- service_role roles referenced in `to` clauses. Applied once against a
-- throwaway local Postgres cluster so the real migrations run unmodified and
-- their actual RLS policies can be exercised without the full Supabase stack
-- (which needs Docker, unavailable in this environment).

create schema if not exists auth;

create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  raw_user_meta_data  jsonb not null default '{}'::jsonb
);

-- Matches Supabase's real implementation: reads the sub/role claim set by
-- PostgREST from the request JWT via `request.jwt.claim.<name>` GUCs.
create or replace function auth.uid() returns uuid
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role() returns text
  language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant anon, authenticated, service_role to postgres;
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
