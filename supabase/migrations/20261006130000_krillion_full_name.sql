-- Krillion: a real name next to the nick (shown on hover). Safe to re-run.
-- Written with plain assignments, never the query-result-to-variable form,
-- because the Supabase SQL Editor splices its own statements into function
-- bodies when it sees that form.

alter table public.krillion_profiles add column if not exists full_name text;
alter table public.krillion_profiles drop constraint if exists krillion_profiles_full_name_check;
alter table public.krillion_profiles
  add constraint krillion_profiles_full_name_check
  check (full_name is null or char_length(full_name) between 1 and 80);

-- The profile function gains an optional p_full_name. The old one-argument
-- version is dropped so the API has a single candidate to call.
drop function if exists public.krillion_ensure_profile(text);

create or replace function public.krillion_ensure_profile(
  p_display_name text default null,
  p_full_name text default null
)
returns public.krillion_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.krillion_profiles;
  chosen_name text;
  chosen_full text;
  linked_name text;
  linked_admin boolean := false;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  result := (select p from public.krillion_profiles p where p.id = uid);
  if result.id is not null then
    return result;
  end if;

  -- Arena Tracker (same Supabase project): Riot name and site admins. Both
  -- lookups are skipped when those tables are not there.
  begin
    linked_name := (
      select coalesce(nullif(trim(p.riot_game_name), ''), nullif(trim(p.gamer_tag), ''))
      from public.profiles p
      where p.id = uid
    );
  exception
    when undefined_table or undefined_column then
      linked_name := null;
  end;

  begin
    linked_admin := exists (select 1 from public.app_admins a where a.user_id = uid);
  exception
    when undefined_table or undefined_column then
      linked_admin := false;
  end;

  chosen_name := (
    select coalesce(
      nullif(trim(p_display_name), ''),
      nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
      linked_name,
      split_part(coalesce(u.email, 'diver'), '@', 1)
    )
    from auth.users u
    where u.id = uid
  );

  chosen_full := (
    select coalesce(
      nullif(trim(p_full_name), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
    )
    from auth.users u
    where u.id = uid
  );

  insert into public.krillion_profiles (id, display_name, full_name, is_admin)
  values (
    uid,
    left(coalesce(chosen_name, linked_name, 'diver'), 40),
    left(chosen_full, 80),
    coalesce(linked_admin, false) or not exists (select 1 from public.krillion_profiles)
  )
  on conflict (id) do nothing;

  result := (select p from public.krillion_profiles p where p.id = uid);
  return result;
end;
$$;

revoke execute on function public.krillion_ensure_profile(text, text) from public, anon;
grant execute on function public.krillion_ensure_profile(text, text) to authenticated, service_role;

-- The admin list now carries the real name. Return type changes, so drop first.
drop function if exists public.krillion_admin_list_users();

create function public.krillion_admin_list_users()
returns table (
  id uuid,
  display_name text,
  full_name text,
  email text,
  is_admin boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.full_name, u.email::text, p.is_admin, p.created_at
  from public.krillion_profiles p
  join auth.users u on u.id = p.id
  where public.krillion_is_admin()
  order by p.created_at asc;
$$;

revoke execute on function public.krillion_admin_list_users() from public, anon;
grant execute on function public.krillion_admin_list_users() to authenticated, service_role;
