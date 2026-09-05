-- The original policies allowed anyone (including anonymous visitors, e.g. the
-- public demo) to create AND update any broadcast row, with a comment saying
-- "since we don't have auth yet" -- that's no longer true. Tie writes to the
-- authenticated owner instead.

alter table public.live_broadcasts
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Existing rows predate ownership tracking; they have no owner to attribute
-- them to, so retire them rather than leave them permanently active/orphaned.
update public.live_broadcasts set is_active = false where user_id is null;

drop policy if exists "Anyone can create broadcasts" on public.live_broadcasts;
drop policy if exists "Anyone can update broadcasts" on public.live_broadcasts;

create policy "Owners can create broadcasts"
  on public.live_broadcasts for insert
  with check (auth.uid() = user_id);

create policy "Owners can update their broadcasts"
  on public.live_broadcasts for update
  using (auth.uid() = user_id);
