-- Track real token/search usage per AI generation so future cost questions
-- have exact numbers instead of estimates.
alter table public.ai_generation_log
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists web_searches integer,
  add column if not exists estimated_cost_usd numeric(10,4);
