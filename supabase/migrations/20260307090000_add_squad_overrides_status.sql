
-- 'suggested' overrides are edits a narrator made that haven't been reviewed
-- yet — they must NOT change what other narrators see when they fetch this
-- team's squad. Only 'confirmed' overrides get merged into the shared
-- response (see fetch-squad). The confirm workflow itself isn't built yet;
-- for now everything created lands as 'suggested'.
ALTER TABLE public.squad_overrides
  ADD COLUMN status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed'));
