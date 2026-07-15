-- =============================================================================
-- TamFam initial schema
--
-- Design principles:
--   * Row-Level Security (RLS) is ENABLED and DEFAULT-DENY on every table.
--   * Attendance reveals religious belief => UK GDPR Article 9 "special category
--     data". It is therefore readable/writable by admins only (plus each data
--     subject may read their own records for a Subject Access Request).
--   * Contact/address details are PII: base `people` table is admin-or-self only;
--     a limited `people_directory` view exposes just name/type to all members.
--   * All mutations to sensitive tables are recorded in `audit_log` via triggers.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
create type role as enum ('admin', 'member');
create type person_type as enum ('member', 'visitor');
create type recurrence as enum ('none', 'weekly', 'monthly', 'annually');
create type consent_type as enum ('attendance_records', 'contact_storage');

-- ----------------------------------------------------------------------------
-- profiles: links auth.users to a role (and optionally to a person record)
-- ----------------------------------------------------------------------------
create table profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  person_id  uuid,
  role       role not null default 'member',
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER helper so RLS policies can check admin status without
-- recursively triggering the profiles RLS policy.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

-- Auto-create a member profile whenever a new auth user is created (invite flow).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, role)
  values (new.id, 'member')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- people: members and visitors (contact details = PII)
-- ----------------------------------------------------------------------------
create table people (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (length(trim(full_name)) > 0),
  person_type   person_type not null default 'visitor',
  email         text,
  phone         text,
  address_line1 text,
  address_line2 text,
  city          text,
  postcode      text,
  notes         text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz            -- soft delete for the erasure workflow
);

alter table profiles
  add constraint profiles_person_fk foreign key (person_id)
  references people (id) on delete set null;

create index people_person_type_idx on people (person_type) where deleted_at is null;

-- ----------------------------------------------------------------------------
-- meetings: single or recurring. Occurrences are computed in the app.
-- ----------------------------------------------------------------------------
create table meetings (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(trim(title)) > 0),
  description      text,
  location         text,
  starts_at        timestamptz not null,
  duration_minutes int not null default 90 check (duration_minutes > 0),
  recurrence       recurrence not null default 'none',
  recurrence_until date,
  archived         boolean not null default false,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index meetings_active_idx on meetings (starts_at) where archived = false;

-- ----------------------------------------------------------------------------
-- attendance: SPECIAL CATEGORY DATA (reveals religious belief)
-- ----------------------------------------------------------------------------
create table attendance (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references meetings (id) on delete cascade,
  occurrence_date date not null,
  person_id       uuid not null references people (id) on delete cascade,
  present         boolean not null default true,
  recorded_by     uuid references auth.users (id) on delete set null,
  recorded_at     timestamptz not null default now(),
  unique (meeting_id, occurrence_date, person_id)
);

create index attendance_meeting_occurrence_idx
  on attendance (meeting_id, occurrence_date);
create index attendance_person_idx on attendance (person_id);

-- ----------------------------------------------------------------------------
-- consents: append-only record of consent grant/withdrawal (GDPR audit trail)
-- ----------------------------------------------------------------------------
create table consents (
  id           uuid primary key default gen_random_uuid(),
  person_id    uuid not null references people (id) on delete cascade,
  consent_type consent_type not null,
  granted      boolean not null,
  version      text not null default '1.0',
  granted_at   timestamptz,
  withdrawn_at timestamptz,
  captured_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index consents_person_idx on consents (person_id, consent_type);

-- ----------------------------------------------------------------------------
-- audit_log: who did what to sensitive data
-- ----------------------------------------------------------------------------
create table audit_log (
  id            bigint generated always as identity primary key,
  actor_user_id uuid,
  action        text not null,        -- INSERT | UPDATE | DELETE
  entity        text not null,        -- table name
  entity_id     text,
  at            timestamptz not null default now(),
  detail        jsonb
);

create index audit_log_entity_idx on audit_log (entity, entity_id);
create index audit_log_at_idx on audit_log (at desc);

create or replace function log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rec_id text;
begin
  rec_id := coalesce((to_jsonb(new) ->> 'id'), (to_jsonb(old) ->> 'id'));
  insert into audit_log (actor_user_id, action, entity, entity_id, detail)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    rec_id,
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_people
  after insert or update or delete on people
  for each row execute function log_audit();
create trigger audit_attendance
  after insert or update or delete on attendance
  for each row execute function log_audit();
create trigger audit_consents
  after insert or update or delete on consents
  for each row execute function log_audit();
create trigger audit_meetings
  after insert or update or delete on meetings
  for each row execute function log_audit();

-- =============================================================================
-- Row-Level Security
-- =============================================================================
alter table profiles   enable row level security;
alter table people     enable row level security;
alter table meetings   enable row level security;
alter table attendance enable row level security;
alter table consents   enable row level security;
alter table audit_log  enable row level security;

-- profiles: read own or (admin) all; only admins may write (assign roles).
create policy profiles_select on profiles
  for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy profiles_admin_write on profiles
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- people: admins full access; a person may read their own record.
create policy people_select on people
  for select to authenticated
  using (
    is_admin()
    or id = (select person_id from profiles where user_id = auth.uid())
  );
create policy people_admin_write on people
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- meetings: all members may read; only admins add/remove/edit.
create policy meetings_select on meetings
  for select to authenticated using (true);
create policy meetings_admin_write on meetings
  for all to authenticated
  using (is_admin()) with check (is_admin());

-- attendance (Art. 9): admins manage; a person may read their own attendance.
create policy attendance_admin_all on attendance
  for all to authenticated
  using (is_admin()) with check (is_admin());
create policy attendance_read_own on attendance
  for select to authenticated
  using (person_id = (select person_id from profiles where user_id = auth.uid()));

-- consents: admins manage; a person may read their own consent history.
create policy consents_admin_all on consents
  for all to authenticated
  using (is_admin()) with check (is_admin());
create policy consents_read_own on consents
  for select to authenticated
  using (person_id = (select person_id from profiles where user_id = auth.uid()));

-- audit_log: readable by admins only; inserts happen via SECURITY DEFINER trigger.
create policy audit_admin_read on audit_log
  for select to authenticated using (is_admin());

-- ----------------------------------------------------------------------------
-- people_directory: safe, name-only view of active people for all members.
-- Intentionally exposes NO contact details. Runs as definer to bypass the
-- restrictive base-table SELECT policy for these non-sensitive columns only.
-- ----------------------------------------------------------------------------
create view people_directory as
  select id, full_name, person_type
  from people
  where deleted_at is null;

grant select on people_directory to authenticated;

comment on view people_directory is
  'Non-sensitive member/visitor directory (name + type only). No PII.';
