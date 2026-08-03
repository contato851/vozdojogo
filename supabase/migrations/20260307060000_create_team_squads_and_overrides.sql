
-- team_squads: cache of the real squad fetched from API-Football, keyed by the
-- API-Football team id. Refreshed on-demand (fetch-squad) and daily (sync-team-squads).
CREATE TABLE public.team_squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_team_id integer NOT NULL UNIQUE,
  team_name text NOT NULL,
  team_name_normalized text NOT NULL,
  coach text NOT NULL DEFAULT '',
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'api-football',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_squads_normalized ON public.team_squads (team_name_normalized);

ALTER TABLE public.team_squads ENABLE ROW LEVEL SECURITY;

-- Read-only for narrators; all writes go through the fetch-squad / sync-team-squads
-- edge functions using the service role key, so there are no public write policies.
CREATE POLICY "Authenticated users can read team squads"
  ON public.team_squads FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_team_squads_updated_at
  BEFORE UPDATE ON public.team_squads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- squad_overrides: manual corrections narrators apply on top of the API data
-- (add a player the API missed, or flag one who already left as inactive).
-- Original API rows in team_squads are never mutated to remove a player —
-- overrides are additive and carry who made the correction and when.
CREATE TABLE public.squad_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_team_id integer NOT NULL REFERENCES public.team_squads (api_team_id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('add', 'deactivate')),
  player_id text, -- API-Football player id (e.g. "af-276") — required for 'deactivate'
  player_data jsonb, -- full player payload — required for 'add'
  reason text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT squad_overrides_player_ref CHECK (
    (action = 'add' AND player_data IS NOT NULL) OR
    (action = 'deactivate' AND player_id IS NOT NULL)
  )
);

CREATE INDEX idx_squad_overrides_team_active ON public.squad_overrides (api_team_id) WHERE is_active;

ALTER TABLE public.squad_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read squad overrides"
  ON public.squad_overrides FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create squad overrides"
  ON public.squad_overrides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authors can undo their own squad overrides"
  ON public.squad_overrides FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);
