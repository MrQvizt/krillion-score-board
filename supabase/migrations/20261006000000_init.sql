-- Krillion Score Board: initial schema
-- Tables: profiles, boards, board_members, scores
-- Security: row level security on everything, admin helpers as security definer functions.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  emoji text not null default '🦐' check (char_length(emoji) between 1 and 8),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

create index board_members_user_id_idx on public.board_members (user_id);

-- One Krillion dive per player per day. 7 prompts x max 100 points = 700.
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  played_on date not null,
  score integer not null check (score between 0 and 700),
  note text not null default '' check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, played_on)
);

create index scores_played_on_idx on public.scores (played_on);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies never recurse into RLS)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.is_board_member(target_board uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members bm
    where bm.board_id = target_board
      and bm.user_id = auth.uid()
  );
$$;

create or replace function public.shares_board_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.board_members mine
    join public.board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = auth.uid()
      and theirs.user_id = target_user
  );
$$;

-- Admin only: list every account with its email (emails live in auth.users).
create or replace function public.admin_list_users()
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
  from public.profiles p
  join auth.users u on u.id = p.id
  where public.is_admin()
  order by p.created_at asc;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile. The very first profile becomes admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_name text;
  first_profile boolean;
begin
  chosen_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(coalesce(new.email, 'diver'), '@', 1)
  );
  chosen_name := left(chosen_name, 40);
  first_profile := not exists (select 1 from public.profiles);

  insert into public.profiles (id, display_name, is_admin)
  values (new.id, chosen_name, first_profile)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger scores_touch_updated_at
  before update on public.scores
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.scores enable row level security;

-- profiles
create policy "profiles: admins do anything"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles: read self and board mates"
  on public.profiles for select
  using (id = auth.uid() or public.shares_board_with(id));

create policy "profiles: create own (never as admin)"
  on public.profiles for insert
  with check (id = auth.uid() and is_admin = false);

create policy "profiles: edit own name"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and is_admin = public.is_admin());

-- boards
create policy "boards: admins do anything"
  on public.boards for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "boards: members can read"
  on public.boards for select
  using (public.is_board_member(id));

-- board_members
create policy "board_members: admins do anything"
  on public.board_members for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "board_members: members see their board mates"
  on public.board_members for select
  using (public.is_board_member(board_id));

-- scores
create policy "scores: admins do anything"
  on public.scores for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "scores: read own and board mates"
  on public.scores for select
  using (user_id = auth.uid() or public.shares_board_with(user_id));

create policy "scores: insert own"
  on public.scores for insert
  with check (user_id = auth.uid());

create policy "scores: update own"
  on public.scores for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "scores: delete own"
  on public.scores for delete
  using (user_id = auth.uid());
