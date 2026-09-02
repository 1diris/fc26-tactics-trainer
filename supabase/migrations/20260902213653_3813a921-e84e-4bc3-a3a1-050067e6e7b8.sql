CREATE TABLE public.youth_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  career_id UUID NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  age INTEGER,
  overall INTEGER,
  potential_min INTEGER,
  potential_max INTEGER,
  plan TEXT NOT NULL DEFAULT 'Dynamisk',
  photo_data_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youth_players TO authenticated;
GRANT ALL ON public.youth_players TO service_role;

ALTER TABLE public.youth_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "youth_players_own" ON public.youth_players FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX youth_players_career_idx ON public.youth_players (career_id);

CREATE TRIGGER update_youth_players_updated_at BEFORE UPDATE ON public.youth_players
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();