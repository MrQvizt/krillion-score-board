-- Krillion Score Board: initial schema
--
-- Designed for a Supabase project that is SHARED with other apps. Arena Tracker
-- (github.com/MrQvizt/ArenaTracker) lives in the same project, so:
--   * every object is prefixed krillion_ and nothing collides with Arena
--     Tracker's profiles, leaderboard_groups, app_admins, ...;
--   * no trigger is attached to auth.users (Arena Tracker already owns
--     on_auth_user_created). Profiles are created lazily by
--     krillion_ensure_profile() when a user first opens this app, so users of
--     the other apps are not touched until then;
--   * every statement is re-runnable, so pasting this file into the SQL editor
--     a second time is a no-op rather than an error.
--
-- Two soft links to Arena Tracker's data, both optional and guarded so this
-- file also works in a project that does not have those tables:
--   * a new Krillion profile takes its display name from the player's Arena
--     Tracker Riot name (or legacy gamer tag) when they have one;
--   * members of public.app_admins (Arena Tracker's site admins) are Krillion
--     admins from their first visit.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.krillion_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.krillion_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  emoji text not null default '🦐' check (char_length(emoji) between 1 and 8),
  created_by uuid references public.krillion_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.krillion_board_members (
  board_id uuid not null references public.krillion_boards (id) on delete cascade,
  user_id uuid not null references public.krillion_profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index if not exists krillion_board_members_user_id_idx
  on public.krillion_board_members (user_id);

-- One Krillion dive per player per day. 7 prompts x max 100 points = 700.
create table if not exists public.krillion_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.krillion_profiles (id) on delete cascade,
  played_on date not null,
  score integer not null check (score between 0 and 700),
  note text not null default '' check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, played_on)
);

create index if not exists krillion_scores_played_on_idx
  on public.krillion_scores (played_on);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies never recurse into RLS)
-- ---------------------------------------------------------------------------

create or replace function public.krillion_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.krillion_profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.krillion_is_board_member(target_board uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.krillion_board_members bm
    where bm.board_id = target_board
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.krillion_shares_board_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.krillion_board_members mine
    join public.krillion_board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user
  );
$$;

-- Creates the caller's profile if it does not exist yet and returns it.
--
-- Display name, first match wins: the explicit argument, the display_name the
-- sign-up form stored in auth user metadata, the player's Arena Tracker Riot
-- name / gamer tag, the local part of their email.
--
-- Admin: the very first profile ever created, or anyone in Arena Tracker's
-- public.app_admins. The Arena Tracker lookups each sit in their own exception
-- block so a project without those tables (or with a different `profiles`
-- shape) simply skips them.
--
-- Written with plain assignments (var := (subquery)) on purpose. The Supabase
-- SQL Editor scans pasted SQL for the query-result-to-variable form to add
-- "enable row level security" statements, does not notice when that form sits
-- inside a function body, and splices its statement mid-function, which
-- breaks the $$ quoting.
-- Dropped first so this file stays re-runnable after later migrations change
-- the signature: a plain "or replace" would leave a second overload behind.
drop function if exists public.krillion_ensure_profile(text);
drop function if exists public.krillion_ensure_profile(text, text);
create or replace function public.krillion_ensure_profile(p_display_name text default null)
returns public.krillion_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result public.krillion_profiles;
  chosen_name text;
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

  -- Arena Tracker: Riot game name, falling back to the legacy gamer tag.
  -- plpgsql only resolves a statement's tables when it first runs, so a
  -- missing table or column surfaces here as an exception and is skipped.
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

  -- Arena Tracker: site admins.
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

  insert into public.krillion_profiles (id, display_name, is_admin)
  values (
    uid,
    left(coalesce(chosen_name, linked_name, 'diver'), 40),
    coalesce(linked_admin, false) or not exists (select 1 from public.krillion_profiles)
  )
  on conflict (id) do nothing;

  result := (select p from public.krillion_profiles p where p.id = uid);
  return result;
end;
$$;

-- Admin only: list every Krillion account with its email (emails live in auth.users).
drop function if exists public.krillion_admin_list_users();
create function public.krillion_admin_list_users()
returns table (
  id uuid,
  display_name text,
  email text,
  is_admin boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.display_name, u.email::text, p.is_admin, p.created_at
  from public.krillion_profiles p
  join auth.users u on u.id = p.id
  where public.krillion_is_admin()
  order by p.created_at asc;
$$;

-- Lock the helpers down to signed-in users.
revoke execute on function public.krillion_is_admin() from public, anon;
revoke execute on function public.krillion_is_board_member(uuid) from public, anon;
revoke execute on function public.krillion_shares_board_with(uuid) from public, anon;
revoke execute on function public.krillion_ensure_profile(text) from public, anon;
revoke execute on function public.krillion_admin_list_users() from public, anon;
grant execute on function public.krillion_is_admin() to authenticated, service_role;
grant execute on function public.krillion_is_board_member(uuid) to authenticated, service_role;
grant execute on function public.krillion_shares_board_with(uuid) to authenticated, service_role;
grant execute on function public.krillion_ensure_profile(text) to authenticated, service_role;
grant execute on function public.krillion_admin_list_users() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.krillion_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists krillion_scores_touch_updated_at on public.krillion_scores;
create trigger krillion_scores_touch_updated_at
  before update on public.krillion_scores
  for each row execute function public.krillion_touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.krillion_profiles enable row level security;
alter table public.krillion_boards enable row level security;
alter table public.krillion_board_members enable row level security;
alter table public.krillion_scores enable row level security;

-- profiles
drop policy if exists "krillion_profiles: admins do anything" on public.krillion_profiles;
create policy "krillion_profiles: admins do anything"
  on public.krillion_profiles for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

drop policy if exists "krillion_profiles: read self and board mates" on public.krillion_profiles;
create policy "krillion_profiles: read self and board mates"
  on public.krillion_profiles for select
  using (id = auth.uid() or public.krillion_shares_board_with(id));

drop policy if exists "krillion_profiles: edit own name" on public.krillion_profiles;
create policy "krillion_profiles: edit own name"
  on public.krillion_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = public.krillion_is_admin());

-- boards
drop policy if exists "krillion_boards: admins do anything" on public.krillion_boards;
create policy "krillion_boards: admins do anything"
  on public.krillion_boards for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

drop policy if exists "krillion_boards: members can read" on public.krillion_boards;
create policy "krillion_boards: members can read"
  on public.krillion_boards for select
  using (public.krillion_is_board_member(id));

-- board_members
drop policy if exists "krillion_board_members: admins do anything" on public.krillion_board_members;
create policy "krillion_board_members: admins do anything"
  on public.krillion_board_members for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

drop policy if exists "krillion_board_members: members see their board mates" on public.krillion_board_members;
create policy "krillion_board_members: members see their board mates"
  on public.krillion_board_members for select
  using (public.krillion_is_board_member(board_id));

-- scores
drop policy if exists "krillion_scores: admins do anything" on public.krillion_scores;
create policy "krillion_scores: admins do anything"
  on public.krillion_scores for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

drop policy if exists "krillion_scores: read own and board mates" on public.krillion_scores;
create policy "krillion_scores: read own and board mates"
  on public.krillion_scores for select
  using (user_id = auth.uid() or public.krillion_shares_board_with(user_id));

drop policy if exists "krillion_scores: insert own" on public.krillion_scores;
create policy "krillion_scores: insert own"
  on public.krillion_scores for insert
  with check (user_id = auth.uid());

drop policy if exists "krillion_scores: update own" on public.krillion_scores;
create policy "krillion_scores: update own"
  on public.krillion_scores for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "krillion_scores: delete own" on public.krillion_scores;
create policy "krillion_scores: delete own"
  on public.krillion_scores for delete
  using (user_id = auth.uid());
