ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS fc_player_id uuid NULL REFERENCES public.fc_players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fc_match_source text NULL;

CREATE INDEX IF NOT EXISTS players_fc_player_id_idx ON public.players (fc_player_id);