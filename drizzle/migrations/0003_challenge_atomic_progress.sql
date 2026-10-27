CREATE FUNCTION public.change_challenge_progress(p_challenge_id text, p_action text, p_goal_id text DEFAULT NULL, p_completed boolean DEFAULT false, p_delta integer DEFAULT 1, p_source text DEFAULT 'manual') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_action NOT IN ('goal','penalty','reset') OR p_source NOT IN ('manual','auto') OR p_delta NOT BETWEEN -1 AND 1 THEN RAISE EXCEPTION 'Invalid progress update'; END IF;
 UPDATE public.challenge_progress SET
 completions = CASE WHEN p_action = 'reset' THEN '{}'::jsonb WHEN p_action = 'goal' THEN jsonb_set(completions, ARRAY[p_goal_id], jsonb_build_object('completed',p_completed,'source',p_source)) ELSE completions END,
 penalty_count = CASE WHEN p_action = 'reset' THEN 0 WHEN p_action = 'penalty' THEN greatest(0, penalty_count + p_delta) ELSE penalty_count END,
 updated_at = now()
 WHERE user_id = auth.uid() AND challenge_id = p_challenge_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Start the challenge first'; END IF;
END; $$;
REVOKE ALL ON FUNCTION public.change_challenge_progress(text,text,text,boolean,integer,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_challenge_progress(text,text,text,boolean,integer,text) TO authenticated;