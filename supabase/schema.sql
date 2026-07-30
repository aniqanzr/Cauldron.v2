create table if not exists public.pantry_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  category text not null default 'Other',
  quantity numeric not null default 1 check (quantity > 0),
  unit text not null default 'item',
  expires_in integer not null default 14 check (expires_in >= 0),
  location text not null default 'Pantry',
  color text not null default 'bg-stone-200 text-stone-800',
  inserted_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, id)
);

create index if not exists pantry_items_user_expiry_idx
  on public.pantry_items (user_id, expires_in);

alter table public.pantry_items enable row level security;

drop policy if exists "Users can read own pantry items" on public.pantry_items;
create policy "Users can read own pantry items"
  on public.pantry_items
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own pantry items" on public.pantry_items;
create policy "Users can insert own pantry items"
  on public.pantry_items
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own pantry items" on public.pantry_items;
create policy "Users can update own pantry items"
  on public.pantry_items
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own pantry items" on public.pantry_items;
create policy "Users can delete own pantry items"
  on public.pantry_items
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_pantry_items_updated_at on public.pantry_items;
create trigger set_pantry_items_updated_at
  before update on public.pantry_items
  for each row
  execute function public.set_updated_at();
