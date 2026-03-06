
CREATE TABLE public.custom_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  abbreviation text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#003399',
  accent text NOT NULL DEFAULT '#ffffff',
  logo_url text,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own custom teams"
ON public.custom_teams FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom teams"
ON public.custom_teams FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom teams"
ON public.custom_teams FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom teams"
ON public.custom_teams FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_custom_teams_updated_at
  BEFORE UPDATE ON public.custom_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
