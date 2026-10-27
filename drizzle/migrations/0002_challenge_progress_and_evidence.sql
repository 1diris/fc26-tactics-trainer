CREATE TABLE public.challenge_progress (
 user_id uuid NOT NULL,
 challenge_id text NOT NULL,
 completions jsonb NOT NULL DEFAULT '{}'::jsonb,
 penalty_count integer NOT NULL DEFAULT 0 CHECK (penalty_count >= 0),
 started_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, challenge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_progress TO authenticated;
GRANT ALL ON public.challenge_progress TO service_role;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_progress_own ON public.challenge_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE public.challenge_verifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 challenge_id text NOT NULL,
 goal_id text NOT NULL,
 storage_paths text[] NOT NULL DEFAULT '{}',
 ai_response jsonb,
 extracted_value jsonb,
 status text NOT NULL DEFAULT 'processing',
 details text,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY (user_id, challenge_id) REFERENCES public.challenge_progress(user_id, challenge_id) ON DELETE CASCADE
);
GRANT SELECT ON public.challenge_verifications TO authenticated;
GRANT ALL ON public.challenge_verifications TO service_role;
ALTER TABLE public.challenge_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY challenge_verifications_own_read ON public.challenge_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX challenge_verifications_goal_idx ON public.challenge_verifications(user_id, challenge_id, goal_id, created_at);
CREATE FUNCTION public.reserve_challenge_verification(p_challenge_id text, p_goal_id text, p_paths text[]) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM 1 FROM public.challenge_progress WHERE user_id = auth.uid() AND challenge_id = p_challenge_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Start the challenge first'; END IF;
 IF cardinality(p_paths) < 1 OR cardinality(p_paths) > 3 THEN RAISE EXCEPTION 'Choose 1 to 3 screenshots'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(p_paths) AS path WHERE path NOT LIKE auth.uid()::text || '/' || p_challenge_id || '/%') THEN RAISE EXCEPTION 'Invalid screenshot owner'; END IF;
 IF (SELECT count(*) FROM public.challenge_verifications WHERE user_id = auth.uid() AND challenge_id = p_challenge_id AND goal_id = p_goal_id) >= 5 THEN RAISE EXCEPTION 'Maximum 5 uploads per goal'; END IF;
 INSERT INTO public.challenge_verifications(user_id, challenge_id, goal_id, storage_paths) VALUES (auth.uid(), p_challenge_id, p_goal_id, p_paths) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_challenge_verification(text,text,text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_challenge_verification(text,text,text[]) TO authenticated;
CREATE POLICY challenge_screenshots_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'challenge-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY challenge_screenshots_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'challenge-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY challenge_screenshots_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'challenge-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);