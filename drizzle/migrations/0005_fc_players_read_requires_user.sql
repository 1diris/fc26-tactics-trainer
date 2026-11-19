DROP POLICY IF EXISTS "fc_players_read" ON public.fc_players;
CREATE POLICY "fc_players_read" ON public.fc_players FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE INSERT, UPDATE, DELETE ON public.fc_players FROM anon, authenticated;