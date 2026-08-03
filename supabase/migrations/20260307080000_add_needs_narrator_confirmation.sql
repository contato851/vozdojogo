
ALTER TABLE public.team_api_mappings
  ADD COLUMN needs_narrator_confirmation boolean NOT NULL DEFAULT false;
