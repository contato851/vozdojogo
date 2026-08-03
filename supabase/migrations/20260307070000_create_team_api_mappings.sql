
-- team_api_mappings: mapeamento confiável nome-do-app -> time da API-Football.
-- fetch-squad passa a consultar essa tabela em vez de resolver por busca de nome
-- ao vivo, eliminando o risco de pegar um time errado (país/categoria diferente).
CREATE TABLE public.team_api_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_team_name text NOT NULL UNIQUE,
  api_football_team_id integer,
  api_football_team_name text,
  confidence text NOT NULL DEFAULT 'needs_review' CHECK (confidence IN ('confirmed', 'needs_review')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_api_mappings_confirmed_needs_id
    CHECK (confidence != 'confirmed' OR api_football_team_id IS NOT NULL)
);

ALTER TABLE public.team_api_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read team api mappings"
  ON public.team_api_mappings FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_team_api_mappings_updated_at
  BEFORE UPDATE ON public.team_api_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
