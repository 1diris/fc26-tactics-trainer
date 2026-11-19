CREATE OR REPLACE FUNCTION public.change_challenge_progress(
  p_challenge_id text,
  p_action text,
  p_goal_id text DEFAULT NULL,
  p_completed boolean DEFAULT false,
  p_delta integer DEFAULT 1,
  p_source text DEFAULT 'manual'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_challenge_id IS NULL OR btrim(p_challenge_id) = '' THEN RAISE EXCEPTION 'Invalid challenge'; END IF;
  IF p_action NOT IN ('goal', 'penalty', 'reset') OR p_source NOT IN ('manual', 'auto') OR p_delta NOT BETWEEN -1 AND 1 THEN RAISE EXCEPTION 'Invalid progress update'; END IF;
  IF p_action = 'goal' AND (p_goal_id IS NULL OR btrim(p_goal_id) = '') THEN RAISE EXCEPTION 'Goal required'; END IF;

  UPDATE public.challenge_progress SET
    completions = CASE
      WHEN p_action = 'reset' THEN '{}'::jsonb
      WHEN p_action = 'goal' THEN jsonb_set(completions, ARRAY[p_goal_id], jsonb_build_object('completed', p_completed, 'source', p_source))
      ELSE completions
    END,
    penalty_count = CASE
      WHEN p_action = 'reset' THEN 0
      WHEN p_action = 'penalty' THEN greatest(0, penalty_count + p_delta)
      ELSE penalty_count
    END,
    updated_at = now()
  WHERE user_id = auth.uid() AND challenge_id = p_challenge_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'Start the challenge first'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.change_challenge_progress(text, text, text, boolean, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_challenge_progress(text, text, text, boolean, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reserve_challenge_verification(
  p_challenge_id text,
  p_goal_id text,
  p_paths text[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_prefix text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_challenge_id IS NULL OR btrim(p_challenge_id) = '' OR p_goal_id IS NULL OR btrim(p_goal_id) = '' THEN RAISE EXCEPTION 'Invalid challenge goal'; END IF;

  PERFORM 1 FROM public.challenge_progress
  WHERE user_id = auth.uid() AND challenge_id = p_challenge_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Start the challenge first'; END IF;

  IF cardinality(p_paths) < 1 OR cardinality(p_paths) > 3 THEN RAISE EXCEPTION 'Choose 1 to 3 screenshots'; END IF;

  v_prefix := auth.uid()::text || '/' || p_challenge_id || '/';
  IF EXISTS (
    SELECT 1 FROM unnest(p_paths) AS path
    WHERE path IS NULL OR left(path, length(v_prefix)) <> v_prefix
  ) THEN RAISE EXCEPTION 'Invalid screenshot owner'; END IF;

  IF (SELECT count(*) FROM public.challenge_verifications WHERE user_id = auth.uid() AND challenge_id = p_challenge_id AND goal_id = p_goal_id) >= 5 THEN RAISE EXCEPTION 'Maximum 5 uploads per goal'; END IF;

  INSERT INTO public.challenge_verifications(user_id, challenge_id, goal_id, storage_paths)
  VALUES (auth.uid(), p_challenge_id, p_goal_id, p_paths)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_challenge_verification(text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reserve_challenge_verification(text, text, text[]) TO authenticated;

DROP POLICY IF EXISTS career_screenshots_insert_own ON storage.objects;
DROP POLICY IF EXISTS career_screenshots_own_insert ON storage.objects;
CREATE POLICY career_screenshots_insert_own_images ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'career-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND metadata ->> 'mimetype' IN ('image/png', 'image/jpeg', 'image/webp')
  AND lower(name) ~ '\.(png|jpe?g|webp)$'
);

DROP POLICY IF EXISTS challenge_screenshots_upload ON storage.objects;
CREATE POLICY challenge_screenshots_upload_images ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'challenge-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND metadata ->> 'mimetype' IN ('image/png', 'image/jpeg', 'image/webp')
  AND lower(name) ~ '\.(png|jpe?g|webp)$'
);