create table public.auction_teams (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  initial_budget integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auction_teams_name_length check (char_length(btrim(name)) between 1 and 80),
  constraint auction_teams_budget_range check (initial_budget between 1 and 100000)
);

create table public.auction_purchases (
  id bigint generated always as identity primary key,
  auction_team_id bigint not null references public.auction_teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  player_id integer not null,
  player_name text not null,
  player_team text not null,
  player_role text not null,
  price integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint auction_purchases_player_name_length check (char_length(btrim(player_name)) between 1 and 100),
  constraint auction_purchases_player_team_length check (char_length(player_team) between 2 and 3),
  constraint auction_purchases_role check (player_role in ('P', 'D', 'C', 'A')),
  constraint auction_purchases_price_range check (price between 1 and 100000),
  constraint auction_purchases_team_player_unique unique (auction_team_id, player_id)
);

create index auction_teams_user_created_idx
  on public.auction_teams (user_id, created_at desc);

create index auction_purchases_user_idx
  on public.auction_purchases (user_id);

create index auction_purchases_team_created_idx
  on public.auction_purchases (auction_team_id, created_at desc);

alter table public.auction_teams enable row level security;
alter table public.auction_purchases enable row level security;

create policy "Users can read their auction teams"
  on public.auction_teams
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their auction teams"
  on public.auction_teams
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their auction teams"
  on public.auction_teams
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their auction teams"
  on public.auction_teams
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their purchases"
  on public.auction_purchases
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create purchases for their teams"
  on public.auction_purchases
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.auction_teams
      where auction_teams.id = auction_team_id
        and auction_teams.user_id = (select auth.uid())
    )
  );

create policy "Users can update purchases for their teams"
  on public.auction_purchases
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.auction_teams
      where auction_teams.id = auction_team_id
        and auction_teams.user_id = (select auth.uid())
    )
  );

create policy "Users can delete their purchases"
  on public.auction_purchases
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.auction_teams from anon;
revoke all on public.auction_purchases from anon;

grant select, insert, update, delete on public.auction_teams to authenticated;
grant select, insert, update, delete on public.auction_purchases to authenticated;
grant usage, select on sequence public.auction_teams_id_seq to authenticated;
grant usage, select on sequence public.auction_purchases_id_seq to authenticated;

comment on table public.auction_teams is 'User-owned fantasy football auction workspaces.';
comment on table public.auction_purchases is 'Players purchased during an auction, isolated by owner through RLS.';
