CREATE OR REPLACE FUNCTION public.fc_league_names()
RETURNS TABLE (league_name text, league_level integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT p.league_name, MIN(p.league_level)::int AS league_level
  FROM public.fc_players p
  WHERE p.league_name IS NOT NULL
  GROUP BY p.league_name
  ORDER BY MIN(p.league_level) NULLS LAST, p.league_name
$$;

REVOKE EXECUTE ON FUNCTION public.fc_league_names() FROM anon;
GRANT EXECUTE ON FUNCTION public.fc_league_names() TO authenticated, service_role;