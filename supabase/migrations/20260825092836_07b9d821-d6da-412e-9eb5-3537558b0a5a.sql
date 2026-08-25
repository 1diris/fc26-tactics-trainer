CREATE TABLE public.tactics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  season_id uuid REFERENCES public.seasons(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Standard',
  formation text NOT NULL DEFAULT '4-3-3',
  lineup jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tactics_career_season_uniq ON public.tactics (career_id, season_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tactics TO authenticated;
GRANT ALL ON public.tactics TO service_role;

ALTER TABLE public.tactics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tactics_own" ON public.tactics FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_tactics_updated BEFORE UPDATE ON public.tactics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();