DROP INDEX IF EXISTS public.tactics_career_season_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS tactics_career_season_name_uniq
  ON public.tactics (career_id, season_id, name) NULLS NOT DISTINCT;