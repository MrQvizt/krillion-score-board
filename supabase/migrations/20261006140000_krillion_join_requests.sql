-- Krillion: divers can ask to join a board; admins approve or decline.
-- Safe to re-run. No query-result-to-variable statements (the Supabase SQL
-- Editor splices its own statements into function bodies when it sees them).

create table if not exists public.krillion_board_join_requests (
  board_id uuid not null references public.krillion_boards (id) on delete cascade,
  user_id uuid not null references public.krillion_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

alter table public.krillion_board_join_requests enable row level security;

drop policy if exists "krillion_join_requests: admins do anything" on public.krillion_board_join_requests;
create policy "krillion_join_requests: admins do anything"
  on public.krillion_board_join_requests for all
  using (public.krillion_is_admin())
  with check (public.krillion_is_admin());

drop policy if exists "krillion_join_requests: read own" on public.krillion_board_join_requests;
create policy "krillion_join_requests: read own"
  on public.krillion_board_join_requests for select
  using (user_id = auth.uid());

drop policy if exists "krillion_join_requests: ask for self" on public.krillion_board_join_requests;
create policy "krillion_join_requests: ask for self"
  on public.krillion_board_join_requests for insert
  with check (user_id = auth.uid() and not public.krillion_is_board_member(board_id));

drop policy if exists "krillion_join_requests: withdraw own" on public.krillion_board_join_requests;
create policy "krillion_join_requests: withdraw own"
  on public.krillion_board_join_requests for delete
  using (user_id = auth.uid());

-- Boards the caller can ask to join: every board they are not on, with the
-- member count and whether they already asked. Security definer, because
-- non-members cannot read krillion_boards directly.
create or replace function public.krillion_boards_to_join()
returns table (
  id uuid,
  name text,
  emoji text,
  description text,
  member_count bigint,
  requested boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id,
    b.name,
    b.emoji,
    b.description,
    (select count(*) from public.krillion_board_members m where m.board_id = b.id) as member_count,
    exists (
      select 1 from public.krillion_board_join_requests r
      where r.board_id = b.id and r.user_id = auth.uid()
    ) as requested
  from public.krillion_boards b
  where auth.uid() is not null
    and not exists (
      select 1 from public.krillion_board_members m
      where m.board_id = b.id and m.user_id = auth.uid()
    )
  order by b.name;
$$;

revoke execute on function public.krillion_boards_to_join() from public, anon;
grant execute on function public.krillion_boards_to_join() to authenticated, service_role;
