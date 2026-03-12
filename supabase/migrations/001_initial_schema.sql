-- ================================================================
-- IPL Fantasy Cricket — Supabase Migration
-- Run via: Supabase Dashboard > SQL Editor, or supabase db push
-- ================================================================

-- Enable UUID extension (already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── IPL TEAMS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ipl_teams (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    short_code  VARCHAR(5)   UNIQUE NOT NULL,
    emoji       VARCHAR(10),
    home_ground VARCHAR(150),
    city        VARCHAR(100),
    color_hex   VARCHAR(7)   DEFAULT '#FFFFFF'
);

-- ── PLAYERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    short_name      VARCHAR(50),
    ipl_team_id     INTEGER REFERENCES ipl_teams(id) ON DELETE SET NULL,
    role            VARCHAR(20)  NOT NULL CHECK (role IN ('bat','bowl','ar','wk')),
    nationality     VARCHAR(50)  DEFAULT 'India',
    is_overseas     BOOLEAN      DEFAULT FALSE,
    credits         NUMERIC(4,1) NOT NULL DEFAULT 8.0,
    emoji           VARCHAR(10)  DEFAULT '🏏',
    jersey_number   INTEGER,
    is_active       BOOLEAN      DEFAULT TRUE,
    season_points   INTEGER      DEFAULT 0,
    matches_played  INTEGER      DEFAULT 0,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ── MATCHES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id                  SERIAL PRIMARY KEY,
    match_number        INTEGER,
    team1_id            INTEGER REFERENCES ipl_teams(id),
    team2_id            INTEGER REFERENCES ipl_teams(id),
    venue               VARCHAR(200),
    city                VARCHAR(100),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    status              VARCHAR(20) DEFAULT 'upcoming'
                            CHECK (status IN ('upcoming','live','completed','cancelled')),
    winner_team_id      INTEGER REFERENCES ipl_teams(id),
    team1_score         VARCHAR(30),
    team2_score         VARCHAR(30),
    motm_player_id      INTEGER REFERENCES players(id),
    external_match_id   VARCHAR(50),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── PLAYER PERFORMANCES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_performances (
    id                  SERIAL PRIMARY KEY,
    match_id            INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id           INTEGER NOT NULL REFERENCES players(id),
    runs_scored         INTEGER  DEFAULT 0,
    balls_faced         INTEGER  DEFAULT 0,
    fours               INTEGER  DEFAULT 0,
    sixes               INTEGER  DEFAULT 0,
    strike_rate         NUMERIC(6,2),
    is_duck             BOOLEAN  DEFAULT FALSE,
    overs_bowled        NUMERIC(4,1) DEFAULT 0,
    wickets             INTEGER  DEFAULT 0,
    runs_conceded       INTEGER  DEFAULT 0,
    economy_rate        NUMERIC(5,2),
    maidens             INTEGER  DEFAULT 0,
    catches             INTEGER  DEFAULT 0,
    stumpings           INTEGER  DEFAULT 0,
    run_outs_direct     INTEGER  DEFAULT 0,
    run_outs_indirect   INTEGER  DEFAULT 0,
    is_playing_xi       BOOLEAN  DEFAULT TRUE,
    is_motm             BOOLEAN  DEFAULT FALSE,
    fantasy_points      INTEGER  DEFAULT 0,
    calculated_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (match_id, player_id)
);

-- ── PROFILES (extends Supabase auth.users) ────────────────────
-- Supabase handles auth; we just store extra profile info
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        VARCHAR(50)  UNIQUE NOT NULL,
    display_name    VARCHAR(100),
    avatar_emoji    VARCHAR(10)  DEFAULT '🏏',
    total_points    INTEGER      DEFAULT 0,
    is_admin        BOOLEAN      DEFAULT FALSE,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

-- ── FANTASY TEAMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fantasy_teams (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_id        INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    team_name       VARCHAR(100) DEFAULT 'My Dream XI',
    captain_id      INTEGER REFERENCES players(id),
    vice_captain_id INTEGER REFERENCES players(id),
    is_locked       BOOLEAN  DEFAULT FALSE,
    total_points    INTEGER  DEFAULT 0,
    rank            INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, match_id)
);

-- ── FANTASY TEAM PLAYERS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS fantasy_team_players (
    id              SERIAL PRIMARY KEY,
    fantasy_team_id INTEGER NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    points_earned   INTEGER DEFAULT 0,
    UNIQUE (fantasy_team_id, player_id)
);

-- ── INDEXES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_players_team        ON players(ipl_team_id);
CREATE INDEX IF NOT EXISTS idx_players_role        ON players(role);
CREATE INDEX IF NOT EXISTS idx_matches_status      ON matches(status);
CREATE INDEX IF NOT EXISTS idx_performances_match  ON player_performances(match_id);
CREATE INDEX IF NOT EXISTS idx_performances_player ON player_performances(player_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_user  ON fantasy_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_match ON fantasy_teams(match_id);

-- ── ROW LEVEL SECURITY (Supabase RLS) ─────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players  ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles readable"
    ON profiles FOR SELECT USING (TRUE);

-- Fantasy teams: users own their teams
CREATE POLICY "Users manage own teams"
    ON fantasy_teams FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Teams readable by all (for leaderboard)"
    ON fantasy_teams FOR SELECT USING (TRUE);

-- Fantasy team players: via team ownership
CREATE POLICY "Team players via team ownership"
    ON fantasy_team_players FOR ALL
    USING (fantasy_team_id IN (
        SELECT id FROM fantasy_teams WHERE user_id = auth.uid()
    ));
CREATE POLICY "Team players readable for leaderboard"
    ON fantasy_team_players FOR SELECT USING (TRUE);

-- Public tables (read-only for users, write via service role)
ALTER TABLE ipl_teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches              ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_performances  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "IPL teams public read"        ON ipl_teams           FOR SELECT USING (TRUE);
CREATE POLICY "Players public read"          ON players             FOR SELECT USING (TRUE);
CREATE POLICY "Matches public read"          ON matches             FOR SELECT USING (TRUE);
CREATE POLICY "Performances public read"     ON player_performances FOR SELECT USING (TRUE);

-- ── AUTO-CREATE PROFILE ON SIGNUP ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── FANTASY POINTS FUNCTION ────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_fantasy_points(perf_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    p   player_performances%ROWTYPE;
    pts INTEGER := 0;
BEGIN
    SELECT * INTO p FROM player_performances WHERE id = perf_id;
    IF p.is_playing_xi THEN pts := pts + 4; END IF;
    pts := pts + COALESCE(p.runs_scored, 0);
    pts := pts + COALESCE(p.fours, 0);
    pts := pts + COALESCE(p.sixes, 0) * 2;
    IF COALESCE(p.runs_scored,0) >= 100 THEN pts := pts + 16;
    ELSIF COALESCE(p.runs_scored,0) >= 50 THEN pts := pts + 8; END IF;
    IF p.is_duck THEN pts := pts - 2; END IF;
    IF COALESCE(p.strike_rate,0) >= 170 THEN pts := pts + 6;
    ELSIF COALESCE(p.strike_rate,0) >= 150 THEN pts := pts + 4;
    ELSIF p.strike_rate IS NOT NULL AND p.strike_rate < 70 THEN pts := pts - 6; END IF;
    pts := pts + COALESCE(p.wickets, 0) * 25;
    pts := pts + COALESCE(p.maidens, 0) * 8;
    IF COALESCE(p.wickets,0) >= 5 THEN pts := pts + 8;
    ELSIF COALESCE(p.wickets,0) >= 3 THEN pts := pts + 4; END IF;
    IF p.economy_rate IS NOT NULL AND COALESCE(p.overs_bowled,0) >= 2 THEN
        IF p.economy_rate < 5 THEN pts := pts + 6;
        ELSIF p.economy_rate < 7 THEN pts := pts + 4;
        ELSIF p.economy_rate > 12 THEN pts := pts - 6;
        ELSIF p.economy_rate > 10 THEN pts := pts - 4; END IF;
    END IF;
    pts := pts + COALESCE(p.catches, 0) * 8;
    pts := pts + COALESCE(p.stumpings, 0) * 12;
    pts := pts + COALESCE(p.run_outs_direct, 0) * 12;
    pts := pts + COALESCE(p.run_outs_indirect, 0) * 6;
    IF (COALESCE(p.catches,0) + COALESCE(p.stumpings,0)) >= 3 THEN pts := pts + 4; END IF;
    IF p.is_motm THEN pts := pts + 15; END IF;
    RETURN GREATEST(pts, 0);
END;
$$ LANGUAGE plpgsql;

-- ── SEED: IPL Teams ────────────────────────────────────────────
INSERT INTO ipl_teams (name, short_code, emoji, home_ground, city, color_hex) VALUES
('Mumbai Indians',             'MI',   '🔵', 'Wankhede Stadium',              'Mumbai',    '#004BA0'),
('Chennai Super Kings',        'CSK',  '🟡', 'MA Chidambaram Stadium',        'Chennai',   '#FDB913'),
('Royal Challengers Bengaluru','RCB',  '🔴', 'M. Chinnaswamy Stadium',        'Bengaluru', '#EC1C24'),
('Kolkata Knight Riders',      'KKR',  '🟣', 'Eden Gardens',                  'Kolkata',   '#3A225D'),
('Delhi Capitals',             'DC',   '🔷', 'Arun Jaitley Stadium',          'Delhi',     '#0078BC'),
('Rajasthan Royals',           'RR',   '🩷', 'Sawai Mansingh Stadium',        'Jaipur',    '#E8197D'),
('Punjab Kings',               'PBKS', '🔴', 'PCA IS Bindra Stadium',         'Mohali',    '#ED1B24'),
('Sunrisers Hyderabad',        'SRH',  '🧡', 'Rajiv Gandhi Intl Stadium',     'Hyderabad', '#F7A721'),
('Gujarat Titans',             'GT',   '🟤', 'Narendra Modi Stadium',         'Ahmedabad', '#1C1C1C'),
('Lucknow Super Giants',       'LSG',  '🟠', 'BRSABV Ekana Stadium',          'Lucknow',   '#A72056')
ON CONFLICT (short_code) DO NOTHING;

-- ── SEED: Players ──────────────────────────────────────────────
INSERT INTO players (full_name, ipl_team_id, role, credits, emoji, nationality, is_overseas) VALUES
('Rohit Sharma',       (SELECT id FROM ipl_teams WHERE short_code='MI'),   'bat',  10.5, '🏏', 'India',       FALSE),
('Jasprit Bumrah',     (SELECT id FROM ipl_teams WHERE short_code='MI'),   'bowl', 10.0, '⚡', 'India',       FALSE),
('Suryakumar Yadav',   (SELECT id FROM ipl_teams WHERE short_code='MI'),   'bat',   9.5, '🌟', 'India',       FALSE),
('Ishan Kishan',       (SELECT id FROM ipl_teams WHERE short_code='MI'),   'wk',    9.0, '🧤', 'India',       FALSE),
('Hardik Pandya',      (SELECT id FROM ipl_teams WHERE short_code='MI'),   'ar',    9.5, '💪', 'India',       FALSE),
('MS Dhoni',           (SELECT id FROM ipl_teams WHERE short_code='CSK'),  'wk',    9.0, '🪖', 'India',       FALSE),
('Ravindra Jadeja',    (SELECT id FROM ipl_teams WHERE short_code='CSK'),  'ar',    9.0, '🌀', 'India',       FALSE),
('Ruturaj Gaikwad',    (SELECT id FROM ipl_teams WHERE short_code='CSK'),  'bat',   9.5, '👑', 'India',       FALSE),
('Deepak Chahar',      (SELECT id FROM ipl_teams WHERE short_code='CSK'),  'bowl',  8.0, '🎯', 'India',       FALSE),
('Devon Conway',       (SELECT id FROM ipl_teams WHERE short_code='CSK'),  'bat',   9.0, '🥝', 'New Zealand', TRUE),
('Virat Kohli',        (SELECT id FROM ipl_teams WHERE short_code='RCB'),  'bat',  11.0, '🔥', 'India',       FALSE),
('Glenn Maxwell',      (SELECT id FROM ipl_teams WHERE short_code='RCB'),  'ar',    9.0, '💥', 'Australia',   TRUE),
('Mohammed Siraj',     (SELECT id FROM ipl_teams WHERE short_code='RCB'),  'bowl',  8.5, '🏹', 'India',       FALSE),
('Faf du Plessis',     (SELECT id FROM ipl_teams WHERE short_code='RCB'),  'bat',   9.5, '🦁', 'South Africa',TRUE),
('Andre Russell',      (SELECT id FROM ipl_teams WHERE short_code='KKR'),  'ar',   10.0, '💣', 'West Indies', TRUE),
('Shreyas Iyer',       (SELECT id FROM ipl_teams WHERE short_code='KKR'),  'bat',   9.5, '🎖️','India',        FALSE),
('Sunil Narine',       (SELECT id FROM ipl_teams WHERE short_code='KKR'),  'ar',    9.0, '🕯️','West Indies',  TRUE),
('Jos Buttler',        (SELECT id FROM ipl_teams WHERE short_code='RR'),   'wk',   10.5, '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'England', TRUE),
('Sanju Samson',       (SELECT id FROM ipl_teams WHERE short_code='RR'),   'wk',    9.5, '🎨', 'India',      FALSE),
('Yuzvendra Chahal',   (SELECT id FROM ipl_teams WHERE short_code='RR'),   'bowl',  8.5, '🔮', 'India',      FALSE),
('Rashid Khan',        (SELECT id FROM ipl_teams WHERE short_code='GT'),   'bowl', 10.0, '🕷️','Afghanistan',  TRUE),
('Shubman Gill',       (SELECT id FROM ipl_teams WHERE short_code='GT'),   'bat',   9.5, '🌠', 'India',      FALSE),
('KL Rahul',           (SELECT id FROM ipl_teams WHERE short_code='LSG'),  'wk',   10.5, '⚡', 'India',      FALSE),
('Rishabh Pant',       (SELECT id FROM ipl_teams WHERE short_code='DC'),   'wk',   10.0, '🦁', 'India',      FALSE),
('David Warner',       (SELECT id FROM ipl_teams WHERE short_code='DC'),   'bat',   9.0, '🦘', 'Australia',  TRUE)
ON CONFLICT DO NOTHING;
