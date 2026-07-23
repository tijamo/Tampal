-- =============================================================================
-- Narrow attendance access from "any authenticated user" down to admins and
-- the new register_taker role.
--
-- 0005_self_service_rls.sql deliberately opened up attendance
-- select/insert/update to any authenticated user so members could take a
-- register themselves -- and, since that select policy covered everyone
-- anyway, it dropped 0001_init.sql's narrower attendance_read_own (a person
-- reading only their own attendance, for GDPR subject-access). That's being
-- replaced with a role you explicitly grant, so only people trusted with
-- this (Art. 9 special-category) data get broad access -- restoring
-- attendance_read_own so a plain member keeps their own subject-access
-- right even though they no longer see everyone else's.
-- =============================================================================

create or replace function can_take_register()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'register_taker')
  );
$$;

drop policy if exists attendance_select_any_authenticated on attendance;
drop policy if exists attendance_write_any_authenticated on attendance;
drop policy if exists attendance_update_any_authenticated on attendance;

create policy attendance_read_own on attendance
  for select to authenticated
  using (person_id = (select person_id from profiles where user_id = auth.uid()));

create policy attendance_select_register_takers on attendance
  for select to authenticated
  using (can_take_register());

create policy attendance_write_register_takers on attendance
  for insert to authenticated
  with check (can_take_register());

create policy attendance_update_register_takers on attendance
  for update to authenticated
  using (can_take_register())
  with check (can_take_register());
