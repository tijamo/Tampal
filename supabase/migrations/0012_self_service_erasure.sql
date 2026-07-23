-- =============================================================================
-- Self-service GDPR erasure (Article 17) and export (Article 15).
--
-- Design notes:
--   * A single erase_person_data() RPC now serves both admins (erasing
--     anyone) and members (erasing only themselves), replacing the admin
--     action's inline UPDATE. Centralising it fixes a real gap: the old
--     admin-only path only ever nulled the original contact columns and was
--     never updated when 0008 added birthdate/baptism/join_date/
--     talents_hobbies/home_church/tags -- those survived "erasure"
--     untouched. One function means one field list to keep current.
--   * Also nulls family_id, so an erased person doesn't linger in another
--     family's member list.
--   * SECURITY DEFINER so a member (who has no direct UPDATE grant on
--     people -- only admins do, via people_admin_write) can erase their own
--     row without a blanket self-UPDATE policy, matching the existing
--     update_own_contact_details pattern. The function itself enforces
--     "admin, or your own record" rather than relying on RLS.
--   * The export route (app code) gets the equivalent "admin or self" check
--     directly, since it's a read of already RLS-visible rows (people_select
--     already allows a person to read their own record).
-- =============================================================================

create or replace function erase_person_data(p_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_person_id uuid;
begin
  select person_id into v_caller_person_id from profiles where user_id = auth.uid();

  if not is_admin() and (v_caller_person_id is null or v_caller_person_id <> p_person_id) then
    raise exception 'You may only erase your own data.';
  end if;

  update people
     set first_name       = 'Erased record',
         surname           = null,
         email             = null,
         phone             = null,
         address_line1     = null,
         address_line2     = null,
         city              = null,
         postcode          = null,
         notes             = null,
         birthdate         = null,
         baptism_date      = null,
         baptism_location  = null,
         join_date         = null,
         talents_hobbies   = null,
         home_church       = null,
         tags              = '{}',
         family_id         = null,
         deleted_at        = now()
   where id = p_person_id
     and deleted_at is null;
end;
$$;

revoke all on function erase_person_data(uuid) from public;
grant execute on function erase_person_data(uuid) to authenticated;
