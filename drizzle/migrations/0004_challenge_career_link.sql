ALTER TABLE public.challenge_progress ADD COLUMN career_id uuid REFERENCES public.careers(id) ON DELETE SET NULL;
CREATE INDEX challenge_progress_career_idx ON public.challenge_progress(user_id, career_id);
DROP POLICY challenge_progress_own ON public.challenge_progress;
CREATE POLICY challenge_progress_own ON public.challenge_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND (career_id IS NULL OR EXISTS (SELECT 1 FROM public.careers c WHERE c.id = career_id AND c.user_id = auth.uid())));