
-- Table to store live broadcast state for sharing
CREATE TABLE public.live_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_code TEXT NOT NULL UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_broadcasts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active broadcasts (for the public viewer)
CREATE POLICY "Anyone can view active broadcasts"
  ON public.live_broadcasts FOR SELECT
  USING (is_active = true);

-- Anyone can insert (since we don't have auth yet in this app)
CREATE POLICY "Anyone can create broadcasts"
  ON public.live_broadcasts FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own broadcasts (matched by share_code)
CREATE POLICY "Anyone can update broadcasts"
  ON public.live_broadcasts FOR UPDATE
  USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_broadcasts;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_live_broadcasts_updated_at
  BEFORE UPDATE ON public.live_broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
