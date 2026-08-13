create table if not exists public.half_it_games (
  id text primary key,
  played_at timestamptz not null default now(),
  mode text not null check (mode in ('multiplayer', 'solo')),
  players jsonb not null
);

alter table public.half_it_games enable row level security;

drop policy if exists "Public can read Half It games" on public.half_it_games;
create policy "Public can read Half It games"
on public.half_it_games
for select
to anon
using (true);

drop policy if exists "Public can add Half It games" on public.half_it_games;
create policy "Public can add Half It games"
on public.half_it_games
for insert
to anon
with check (
  mode in ('multiplayer', 'solo')
  and jsonb_typeof(players) = 'array'
  and jsonb_array_length(players) between 1 and 20
);

grant select, insert on table public.half_it_games to anon;
