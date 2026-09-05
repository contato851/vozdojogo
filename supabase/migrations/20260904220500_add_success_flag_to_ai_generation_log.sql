-- Distinguishes a successful generation (counts against the daily limit)
-- from a real API call that was billed but failed to parse (still logged
-- for cost tracking, but doesn't burn the user's daily allowance).
alter table public.ai_generation_log
  add column if not exists success boolean not null default true;
