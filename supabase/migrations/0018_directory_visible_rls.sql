-- =============================================================================
-- Wire up directory_visible in place of directory_hidden: same effect
-- (a person can be excluded from the directory entirely), but now consistent
-- with directory_phone/email/address's polarity -- granted=true means shown.
--
-- Backfill: anyone who was explicitly hidden (a granted directory_hidden
-- consent) gets an equivalent directory_visible=false row, so nobody who
-- deliberately hid themselves becomes visible again by this change.
-- =============================================================================

with currently_hidden as (
  select c.person_id
  from consents c
  where c.consent_type = 'directory_hidden'
    and c.granted
    and c.created_at = (
      select max(c2.created_at)
      from consents c2
      where c2.person_id = c.person_id
        and c2.consent_type = 'directory_hidden'
    )
)
insert into consents (person_id, consent_type, granted, withdrawn_at, captured_by)
select person_id, 'directory_visible'::consent_type, false, now(), null
from currently_hidden;

-- ----------------------------------------------------------------------------
-- Self-service consent RPC: directory_visible replaces directory_hidden in
-- the allowlist.
-- ----------------------------------------------------------------------------
create or replace function set_own_directory_consent(p_consent_type text, p_granted boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_person_id uuid;
begin
  if p_consent_type not in ('directory_phone', 'directory_email', 'directory_address', 'directory_visible') then
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

-- ----------------------------------------------------------------------------
-- people_directory: default-visible (coalesce ... true) unless the latest
-- directory_visible consent is explicitly false.
-- ----------------------------------------------------------------------------
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
    where c.person_id = p.id and c.consent_type = 'directory_visible'
    order by c.created_at desc
    limit 1
  ) dv on true
  where p.deleted_at is null
    and coalesce(dv.granted, true);

grant select on people_directory to authenticated;

comment on view people_directory is
  'Member/visitor directory. Excludes anyone with a current directory_visible=false consent entirely (default visible). Name + type + family_id for everyone else; phone/email/address only for people who''ve separately opted in to sharing each.';
