#!/bin/bash
# =============================================================================
# Runs once, on an empty Postgres data volume, before the other services start.
# Creates the standard Supabase roles with the password the services use, and
# installs the `auth.jwt()` helper. auth.uid()/auth.role()/auth.email() are
# deliberately left to GoTrue's own bootstrap migration to create (see the
# note below) so ownership doesn't conflict. Idempotent and defensive: the
# supabase/postgres image may already create some of these.
#
# The app's own tables are applied later by ../../migrate.sh, AFTER GoTrue has
# created auth.users at runtime (our triggers reference it).
# =============================================================================
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "postgres" --dbname "postgres" <<-EOSQL
  -- ---- Service login roles -------------------------------------------------
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator LOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
    END IF;
  END
  \$\$;

  -- Passwords for the login roles the services authenticate with.
  ALTER ROLE authenticator       WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}' CREATEROLE;
  ALTER ROLE supabase_admin      WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}' SUPERUSER;

  -- authenticator can switch into the request roles (PostgREST relies on this).
  GRANT anon, authenticated, service_role TO authenticator;

  -- ---- auth schema + JWT claim helpers ------------------------------------
  CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

  -- GoTrue issues UNQUALIFIED table names (e.g. "schema_migrations", no schema
  -- prefix), which Postgres resolves via the connecting role's search_path.
  -- Without this, supabase_auth_admin falls back to the default search_path
  -- ("\$user", public) and tries to create GoTrue's tables in "public", where it
  -- has no privileges -> "permission denied for schema public".
  ALTER ROLE supabase_auth_admin SET search_path = auth;

  -- NOTE: auth.uid(), auth.role() and auth.email() are deliberately NOT
  -- created here. GoTrue's own bootstrap migration
  -- (20211124214934_update_auth_functions.up.sql) creates functionally-
  -- identical versions of ALL THREE in one migration -- and it does so AS
  -- supabase_auth_admin. If we pre-create ANY of them here (as postgres),
  -- GoTrue's CREATE OR REPLACE fails with "must be owner of function X":
  -- replacing a function requires being ITS owner, not just having rights on
  -- the schema -- and since all three are replaced in a single migration
  -- transaction, one ownership conflict rolls back all three. Our own app
  -- migrations only ever call auth.uid(), which by the time they run
  -- (../../migrate.sh, after the stack is healthy) GoTrue has already created.
  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE AS \$\$
      SELECT coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
      )::jsonb;
  \$\$;

  GRANT EXECUTE ON FUNCTION auth.jwt()
    TO anon, authenticated, service_role;

  -- Sensible default privileges so PostgREST roles can use the public schema.
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
EOSQL

echo "TamFam: base roles and auth helpers initialised."
