-- =============================================================================
-- Wire up directory_hidden: exclude anyone whose latest directory_hidden
-- consent is granted from people_directory entirely (not just their contact
-- fields), and let a member set it on themselves via the same self-service
-- RPC used for phone/email/address. An admin can already set it on anyone's
-- behalf via the existing generic setConsent() action/consents_admin_all
-- policy -- no new admin-side plumbing needed.
--
-- No new columns, so this can use create or replace view freely.
-- =============================================================================

create or replace view people_directory as
  select
    p.id,
    p.first_name,
    p.surname,
    p.person_type,
    case when coalesce(dp.granted, false) then p.phone else null end as phone,
    case when coalesce(de.granted, false) then p.email else null end as email,
    p.family_id,
    case when coalesce(da.granted, false) then p.address_line1 else null end as address_line1,
    case when coalesce(da.granted, false) then p.address_line2 else null end as address_line2,
    case when coalesce(da.granted, false) then p.city else null end as city,
    case when coalesce(da.granted, false) then p.postcode else null end as postcode
  from people p
  left join lateral (
    select c.granted
    from consents c
    where c.person_id = p.id and c.consent_type = 'directory_phone'
    order by c.created_at desc
    limit 1
  ) dp on true
  left join lateral (
    select c.granted
    from consents c
    where c.person_id = p.id and c.consent_type = 'directory_email'
    order by c.created_at desc
    limit 1
  ) de on true
  left join lateral (
    select c.granted
    from consents c
    where c.person_id = p.id and c.consent_type = 'directory_address'
    order by c.created_at desc
    limit 1
  ) da on true
  left join lateral (
    select c.granted
    from consents c
    where c.person_id = p.id and c.consent_type = 'directory_hidden'
    order by c.created_at desc
    limit 1
  ) dh on true
  where p.deleted_at is null
    and not coalesce(dh.granted, false);

grant select on people_directory to authenticated;

comment on view people_directory is
  'Member/visitor directory. Excludes anyone with a current directory_hidden consent entirely. Name + type + family_id for everyone else; phone/email/address only for people who''ve separately opted in to sharing each.';

create or replace function set_own_directory_consent(p_consent_type text, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid;
begin
  if p_consent_type not in ('directory_phone', 'directory_email', 'directory_address', 'directory_hidden') then
    raise exception 'Invalid consent type for self-service directory consent.';
  end if;

  select person_id into v_person_id from profiles where user_id = auth.uid();
  if v_person_id is null then
    raise exception 'Your account is not linked to a member record.';
  end if;

  insert into consents (person_id, consent_type, granted, granted_at, withdrawn_at, captured_by)
  values (
    v_person_id,
    p_consent_type::consent_type,
    p_granted,
    case when p_granted then now() else null end,
    case when p_granted then null else now() end,
    auth.uid()
  );
end;
$$;

revoke all on function set_own_directory_consent(text, boolean) from public;
grant execute on function set_own_directory_consent(text, boolean) to authenticated;
