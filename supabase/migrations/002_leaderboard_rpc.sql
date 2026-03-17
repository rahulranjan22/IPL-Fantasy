-- 002_leaderboard_rpc.sql — RPC functions + profile trigger fix

-- ── Fix profile trigger to save avatar_emoji from signup metadata ──
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name, avatar_emoji)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_emoji', '🏏')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════

-- Season leaderboard: aggregated rankings across all matches
CREATE OR REPLACE FUNCTION season_leaderboard(lim INT DEFAULT 50)
RETURNS TABLE (
  username TEXT,
  display_name TEXT,
  avatar_emoji TEXT,
  total_points BIGINT,
  matches_played BIGINT
) LANGUAGE sql STABLE AS $$
  SELECT
    p.username,
    p.display_name,
    p.avatar_emoji,
    COALESCE(SUM(ft.total_points), 0)::BIGINT AS total_points,
    COUNT(ft.id)::BIGINT AS matches_played
  FROM profiles p
  JOIN fantasy_teams ft ON ft.user_id = p.id
  GROUP BY p.username, p.display_name, p.avatar_emoji
  ORDER BY total_points DESC
  LIMIT lim;
$$;

-- Match leaderboard: rankings for a specific match
CREATE OR REPLACE FUNCTION match_leaderboard(m_id INT)
RETURNS TABLE (
  id INT,
  team_name TEXT,
  total_points INT,
  rank INT,
  username TEXT,
  display_name TEXT,
  avatar_emoji TEXT,
  captain_name TEXT
) LANGUAGE sql STABLE AS $$
  SELECT
    ft.id::INT,
    ft.team_name,
    ft.total_points::INT,
    ft.rank::INT,
    p.username,
    p.display_name,
    p.avatar_emoji,
    cp.full_name AS captain_name
  FROM fantasy_teams ft
  JOIN profiles p ON p.id = ft.user_id
  LEFT JOIN players cp ON cp.id = ft.captain_id
  WHERE ft.match_id = m_id
  ORDER BY ft.total_points DESC
  LIMIT 100;
$$;
