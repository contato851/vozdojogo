-- Tracks each AI ("Gerar com IA" in Notas) call per user so the
-- generate-match-notes edge function can enforce a daily cap and protect
-- against runaway Anthropic API cost. Only the edge function (service role)
-- reads/writes this table -- no client-facing policies are needed.
create table public.ai_generation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_generation_log_user_created_idx
  on public.ai_generation_log (user_id, created_at);

alter table public.ai_generation_log enable row level security;
