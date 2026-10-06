-- Krillion Score Board: initial schema
--
-- Designed for a Supabase project that is SHARED with other apps:
--   * every object is prefixed with krillion_ so nothing collides,
--   * no trigger is attached to auth.users (other apps may have their own),
--   * profiles are created lazily via krillion_ensure_profile() when a user
--     first opens this app, so users of the other apps are not touched.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.krillion_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.krillion_boards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  emoji text not null default '🦐' check (char_length(emoji) between 1 and 8),
  created_by uuid references public.krillion_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.krillion_board_members (
  board_id uuid not null references public.krillion_boards (id) on delete cascade,
  user_id uuid not null references public.krillion_profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index krillion_board_members_user_id_idx on public.krillion_board_members (user_id);

-- One Krillion dive per player per day. 7 prompts x max 100 points = 700.
create table public.krillion_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.krillion_profiles (id) on delete cascade,
  played_on date not null,
  score integer not null check (score between 0 and 700),
  note text not null default '' check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, played_on)
);

create index krillion_scores_played_on_idx on public.krillion_scores (played_on);

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
-- The very first profile ever created becomes admin.
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
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into result from public.krillion_profiles where id = uid;
  if found then
    return result;
  end if;

  select coalesce(
    nullif(trim(p_display_name), ''),
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(u.email, 'diver'), '@', 1)
  )
  into chosen_name
  from auth.users u
  where u.id = uid;

  insert into public.krillion_profiles (id, display_name, is_admin)
  values (
    uid,
    left(coalesce(chosen_name, 'diver'), 40),
    not exists (select 1 from public.krillion_profiles)
  )
  on conflict (id) do nothing;

  select * into result from public.krillion_profiles where id = uid;
  return result;
end;
$$;

-- Admin only: list every Krillion account with its email (emails live in auth.users).
create or replace function public.krillion_admin_list_users()
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
create policy "krillion_profiles: admins do anything"
  on public.krillion_profiles for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

create policy "krillion_profiles: read self and board mates"
  on public.krillion_profiles for select
  using (id = auth.uid() or public.krillion_shares_board_with(id));

create policy "krillion_profiles: edit own name"
  on public.krillion_profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = public.krillion_is_admin());

-- boards
create policy "krillion_boards: admins do anything"
  on public.krillion_boards for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

create policy "krillion_boards: members can read"
  on public.krillion_boards for select
  using (public.krillion_is_board_member(id));

-- board_members
create policy "krillion_board_members: admins do anything"
  on public.krillion_board_members for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

create policy "krillion_board_members: members see their board mates"
  on public.krillion_board_members for select
  using (public.krillion_is_board_member(board_id));

-- scores
create policy "krillion_scores: admins do anything"
  on public.krillion_scores for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

create policy "krillion_scores: read own and board mates"
  on public.krillion_scores for select
  using (user_id = auth.uid() or public.krillion_shares_board_with(user_id));

create policy "krillion_scores: insert own"
  on public.krillion_scores for insert
  with check (user_id = auth.uid());

create policy "krillion_scores: update own"
  on public.krillion_scores for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "krillion_scores: delete own"
  on public.krillion_scores for delete
  using (user_id = auth.uid());
