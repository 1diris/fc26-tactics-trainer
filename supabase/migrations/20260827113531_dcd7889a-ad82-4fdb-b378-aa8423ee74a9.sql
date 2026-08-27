CREATE TABLE public.fc_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  external_id integer NOT NULL UNIQUE,
  short_name text NOT NULL,
  long_name text,
  positions text[] NOT NULL DEFAULT '{}',
  overall integer,
  potential integer,
  value_eur numeric,
  wage_eur numeric,
  release_clause_eur numeric,
  age integer,
  height_cm integer,
  weight_kg integer,
  club_name text,
  league_name text,
  league_level integer,
  nationality_name text,
  preferred_foot text,
  weak_foot integer,
  skill_moves integer,
  contract_until integer,
  pace integer,
  shooting integer,
  passing integer,
  dribbling integer,
  defending integer,
  physic integer,
  face_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fc_players TO authenticated;
GRANT ALL ON public.fc_players TO service_role;

ALTER TABLE public.fc_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fc_players_read" ON public.fc_players FOR SELECT TO authenticated USING (true);

CREATE INDEX fc_players_positions_idx ON public.fc_players USING GIN (positions);
CREATE INDEX fc_players_overall_idx ON public.fc_players (overall DESC);
CREATE INDEX fc_players_age_idx ON public.fc_players (age);
CREATE INDEX fc_players_value_idx ON public.fc_players (value_eur);
CREATE INDEX fc_players_short_name_idx ON public.fc_players (lower(short_name));
CREATE INDEX fc_players_club_idx ON public.fc_players (lower(club_name));

CREATE TABLE public.transfer_targets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  career_id uuid NOT NULL REFERENCES public.careers(id) ON DELETE CASCADE,
  fc_player_id uuid NOT NULL REFERENCES public.fc_players(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 2,
  expected_price numeric,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (career_id, fc_player_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfer_targets TO authenticated;
GRANT ALL ON public.transfer_targets TO service_role;

ALTER TABLE public.transfer_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_targets_own" ON public.transfer_targets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_transfer_targets_updated BEFORE UPDATE ON public.transfer_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();