
CREATE TABLE public.saved_lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_name TEXT NOT NULL,
  team_name_normalized TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, team_name_normalized)
);

ALTER TABLE public.saved_lineups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own lineups" ON public.saved_lineups FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lineups" ON public.saved_lineups FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own lineups" ON public.saved_lineups FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own lineups" ON public.saved_lineups FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_saved_lineups_updated_at BEFORE UPDATE ON public.saved_lineups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
