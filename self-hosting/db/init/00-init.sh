#!/bin/bash
# =============================================================================
# Runs once, on an empty Postgres data volume, before the other services start.
# Creates the standard Supabase roles with the password the services use.
# Deliberately creates NONE of the auth.uid()/role()/email()/jwt() helper
# functions -- GoTrue's own bootstrap migrations create and own ALL FOUR
# across several of its migration files (see the note below), and every one
# we pre-created here ourselves collided with GoTrue's CREATE OR REPLACE.
# Idempotent and defensive: the supabase/postgres image may already create
# some of the roles below.
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

  -- ---- auth schema ---------------------------------------------------------
  CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

  -- GoTrue issues UNQUALIFIED table names (e.g. "schema_migrations", no schema
  -- prefix), which Postgres resolves via the connecting role's search_path.
  -- Without this, supabase_auth_admin falls back to the default search_path
  -- ("\$user", public) and tries to create GoTrue's tables in "public", where it
  -- has no privileges -> "permission denied for schema public".
  ALTER ROLE supabase_auth_admin SET search_path = auth;

  -- NOTE: auth.uid(), auth.role(), auth.email() and auth.jwt() are
  -- deliberately NOT created here -- not even auth.jwt(), which we tried
  -- keeping once and it too turned out to be owned by a GoTrue migration
  -- (20220531120530_add_auth_jwt_function.up.sql). GoTrue's bootstrap
  -- migrations create and own all four, running AS supabase_auth_admin; any
  -- one we pre-create ourselves (as postgres) breaks GoTrue's CREATE OR
  -- REPLACE with "must be owner of function X", rolling back that whole
  -- migration. Our own app migrations only ever call auth.uid(), which by
  -- the time they run (../../migrate.sh, after the stack is healthy) GoTrue
  -- has already created.

  -- Sensible default privileges so PostgREST roles can use the public schema.
  GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
EOSQL

echo "TamFam: base roles and auth helpers initialised."
