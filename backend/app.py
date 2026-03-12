"""
IPL Fantasy Cricket — Production Flask API
Hosted on Render.com | DB: Supabase PostgreSQL
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt_identity
import requests

app = Flask(__name__)

# ── Config ─────────────────────────────────────────────────────
app.config['JWT_SECRET_KEY']            = os.environ['JWT_SECRET_KEY']
app.config['JWT_ACCESS_TOKEN_EXPIRES']  = timedelta(hours=2)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

SUPABASE_URL     = os.environ['SUPABASE_URL']       # https://xxxx.supabase.co
SUPABASE_ANON    = os.environ['SUPABASE_ANON_KEY']  # public anon key
SUPABASE_SERVICE = os.environ['SUPABASE_SERVICE_KEY']# service role key (admin ops)
DATABASE_URL     = os.environ['DATABASE_URL']        # postgres://... from Supabase
CRICAPI_KEY      = os.environ.get('CRICAPI_KEY', '')

CORS(app, origins=os.environ.get('ALLOWED_ORIGINS', '*').split(','))
JWTManager(app)

# ── DB Connection ──────────────────────────────────────────────
def get_db():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def db_query(sql, params=None, fetch='all'):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            if fetch == 'all':  return cur.fetchall()
            if fetch == 'one':  return cur.fetchone()
            conn.commit();      return None

def db_execute(sql, params=None):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            conn.commit()
            try:    return cur.fetchone()
            except: return None
    finally:
        conn.close()

# ── Supabase Auth Helper ────────────────────────────────────────
def supabase_get(path, token=None, service=False):
    key = SUPABASE_SERVICE if service else SUPABASE_ANON
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {token or key}',
        'Content-Type': 'application/json',
    }
    r = requests.get(f'{SUPABASE_URL}/rest/v1/{path}', headers=headers)
    return r.json()

def supabase_post(path, data, service=False):
    key = SUPABASE_SERVICE if service else SUPABASE_ANON
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
    }
    r = requests.post(f'{SUPABASE_URL}/rest/v1/{path}', json=data, headers=headers)
    return r.json()

def admin_required(f):
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        uid = get_jwt_identity()
        row = db_query('SELECT is_admin FROM profiles WHERE id=%s', (uid,), fetch='one')
        if not row or not row['is_admin']:
            return jsonify({'error': 'Admin only'}), 403
        return f(*args, **kwargs)
    return decorated

# ══════════════════════════════════════════════════════════════
# HEALTH
# ══════════════════════════════════════════════════════════════
@app.get('/api/health')
def health():
    try:
        db_query('SELECT 1', fetch='one')
        db_ok = True
    except Exception as e:
        db_ok = False
    return jsonify({'status': 'ok' if db_ok else 'degraded', 'db': db_ok})

# ══════════════════════════════════════════════════════════════
# AUTH  (Supabase handles register/login — we just proxy + profile)
# ══════════════════════════════════════════════════════════════
from flask import request, Blueprint
from flask_jwt_extended import create_access_token, create_refresh_token

@app.post('/api/auth/register')
def register():
    data = request.get_json()
    # Create user in Supabase Auth
    r = requests.post(
        f'{SUPABASE_URL}/auth/v1/signup',
        json={'email': data['email'], 'password': data['password'],
              'data': {'username': data.get('username',''), 'display_name': data.get('display_name','')}},
        headers={'apikey': SUPABASE_ANON, 'Content-Type': 'application/json'}
    )
    res = r.json()
    if r.status_code != 200 or 'error' in res:
        return jsonify({'error': res.get('error_description', res.get('msg', 'Signup failed'))}), 400

    user_id = res['user']['id']
    # Profile auto-created by trigger; generate our JWT for API calls
    access  = create_access_token(identity=user_id)
    refresh = create_refresh_token(identity=user_id)
    return jsonify({'access_token': access, 'refresh_token': refresh,
                    'user': {'id': user_id, 'email': data['email']}}), 201


@app.post('/api/auth/login')
def login():
    data = request.get_json()
    r = requests.post(
        f'{SUPABASE_URL}/auth/v1/token?grant_type=password',
        json={'email': data['email'], 'password': data['password']},
        headers={'apikey': SUPABASE_ANON, 'Content-Type': 'application/json'}
    )
    res = r.json()
    if r.status_code != 200 or 'error' in res:
        return jsonify({'error': 'Invalid credentials'}), 401

    user_id = res['user']['id']
    profile = db_query('SELECT * FROM profiles WHERE id=%s', (user_id,), fetch='one')
    access  = create_access_token(identity=user_id)
    refresh = create_refresh_token(identity=user_id)
    return jsonify({
        'access_token': access, 'refresh_token': refresh,
        'user': dict(profile) if profile else {'id': user_id}
    })


@app.post('/api/auth/refresh')
@jwt_required(refresh=True)
def refresh_token():
    uid = get_jwt_identity()
    return jsonify({'access_token': create_access_token(identity=uid)})


@app.get('/api/auth/me')
@jwt_required()
def me():
    uid     = get_jwt_identity()
    profile = db_query('SELECT * FROM profiles WHERE id=%s', (uid,), fetch='one')
    return jsonify(dict(profile) if profile else {})

# ══════════════════════════════════════════════════════════════
# PLAYERS
# ══════════════════════════════════════════════════════════════
@app.get('/api/players')
def get_players():
    role   = request.args.get('role')
    team   = request.args.get('team')   # short_code
    search = request.args.get('search', '')
    sort   = request.args.get('sort', 'season_points')

    sql = """
        SELECT p.*, t.name AS team_name, t.short_code, t.emoji AS team_emoji, t.color_hex
        FROM players p
        LEFT JOIN ipl_teams t ON t.id = p.ipl_team_id
        WHERE p.is_active = TRUE
    """
    params = []
    if role:   sql += ' AND p.role = %s';                        params.append(role)
    if team:   sql += ' AND t.short_code = %s';                  params.append(team)
    if search: sql += ' AND p.full_name ILIKE %s';               params.append(f'%{search}%')

    order = {'credits': 'p.credits DESC', 'name': 'p.full_name ASC'}.get(sort, 'p.season_points DESC')
    sql  += f' ORDER BY {order}'

    rows = db_query(sql, params)
    return jsonify([dict(r) for r in rows])


@app.get('/api/players/top')
def top_players():
    limit = min(int(request.args.get('limit', 10)), 50)
    rows  = db_query("""
        SELECT p.*, t.short_code, t.emoji AS team_emoji
        FROM players p LEFT JOIN ipl_teams t ON t.id = p.ipl_team_id
        WHERE p.is_active = TRUE
        ORDER BY p.season_points DESC LIMIT %s
    """, (limit,))
    return jsonify([dict(r) for r in rows])


@app.get('/api/players/<int:pid>')
def get_player(pid):
    p = db_query("""
        SELECT p.*, t.name AS team_name, t.short_code, t.emoji AS team_emoji
        FROM players p LEFT JOIN ipl_teams t ON t.id = p.ipl_team_id WHERE p.id=%s
    """, (pid,), fetch='one')
    if not p: return jsonify({'error': 'Not found'}), 404
    recent = db_query("""
        SELECT pp.*, m.scheduled_at, t1.short_code AS vs_team
        FROM player_performances pp
        JOIN matches m ON m.id = pp.match_id
        LEFT JOIN ipl_teams t1 ON t1.id = m.team1_id
        WHERE pp.player_id = %s ORDER BY pp.id DESC LIMIT 5
    """, (pid,))
    result = dict(p)
    result['recent_performances'] = [dict(r) for r in recent]
    return jsonify(result)


@app.post('/api/players')
@admin_required
def add_player():
    d = request.get_json()
    team = db_query('SELECT id FROM ipl_teams WHERE short_code=%s', (d.get('team_code'),), fetch='one')
    row = db_execute("""
        INSERT INTO players (full_name, short_name, ipl_team_id, role, nationality, is_overseas, credits, emoji)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
    """, (d['full_name'], d.get('short_name'), team['id'] if team else None,
          d['role'], d.get('nationality','India'), d.get('is_overseas',False),
          d.get('credits', 8.0), d.get('emoji','🏏')))
    return jsonify({'id': row['id'], 'message': 'Player added'}), 201

# ══════════════════════════════════════════════════════════════
# MATCHES
# ══════════════════════════════════════════════════════════════
@app.get('/api/matches')
def get_matches():
    status = request.args.get('status')
    sql    = """
        SELECT m.*,
               t1.name AS team1_name, t1.short_code AS team1_code, t1.emoji AS team1_emoji,
               t2.name AS team2_name, t2.short_code AS team2_code, t2.emoji AS team2_emoji,
               w.name  AS winner_name, w.short_code AS winner_code,
               p.full_name AS motm_name
        FROM matches m
        LEFT JOIN ipl_teams t1 ON t1.id = m.team1_id
        LEFT JOIN ipl_teams t2 ON t2.id = m.team2_id
        LEFT JOIN ipl_teams w  ON w.id  = m.winner_team_id
        LEFT JOIN players   p  ON p.id  = m.motm_player_id
    """
    params = []
    if status: sql += ' WHERE m.status = %s'; params.append(status)
    sql += ' ORDER BY m.scheduled_at'
    rows = db_query(sql, params)
    return jsonify([dict(r) for r in rows])


@app.get('/api/matches/<int:mid>')
def get_match(mid):
    row = db_query("""
        SELECT m.*,
               t1.name AS team1_name, t1.short_code AS team1_code, t1.emoji AS team1_emoji,
               t2.name AS team2_name, t2.short_code AS team2_code, t2.emoji AS team2_emoji,
               w.name  AS winner_name, p.full_name AS motm_name
        FROM matches m
        LEFT JOIN ipl_teams t1 ON t1.id = m.team1_id
        LEFT JOIN ipl_teams t2 ON t2.id = m.team2_id
        LEFT JOIN ipl_teams w  ON w.id  = m.winner_team_id
        LEFT JOIN players   p  ON p.id  = m.motm_player_id
        WHERE m.id = %s
    """, (mid,), fetch='one')
    if not row: return jsonify({'error': 'Not found'}), 404
    return jsonify(dict(row))


@app.post('/api/matches')
@admin_required
def create_match():
    d  = request.get_json()
    t1 = db_query('SELECT id FROM ipl_teams WHERE short_code=%s', (d['team1'],), fetch='one')
    t2 = db_query('SELECT id FROM ipl_teams WHERE short_code=%s', (d['team2'],), fetch='one')
    row = db_execute("""
        INSERT INTO matches (match_number, team1_id, team2_id, venue, city, scheduled_at, external_match_id)
        VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
    """, (d.get('match_number'), t1['id'], t2['id'], d.get('venue'), d.get('city'),
          d['scheduled_at'], d.get('external_match_id')))
    return jsonify({'id': row['id']}), 201


@app.patch('/api/matches/<int:mid>')
@admin_required
def update_match(mid):
    d = request.get_json()
    sets, params = [], []
    for field in ['status','team1_score','team2_score','venue','external_match_id']:
        if field in d: sets.append(f'{field}=%s'); params.append(d[field])
    if 'winner' in d:
        w = db_query('SELECT id FROM ipl_teams WHERE short_code=%s', (d['winner'],), fetch='one')
        if w: sets.append('winner_team_id=%s'); params.append(w['id'])
    if 'motm_player_id' in d:
        sets.append('motm_player_id=%s'); params.append(d['motm_player_id'])
    if sets:
        params.append(mid)
        db_execute(f"UPDATE matches SET {','.join(sets)}, updated_at=NOW() WHERE id=%s", params)
    return jsonify({'message': 'Updated'})

# ══════════════════════════════════════════════════════════════
# FANTASY TEAMS
# ══════════════════════════════════════════════════════════════
@app.post('/api/teams')
@jwt_required()
def save_team():
    uid  = get_jwt_identity()
    d    = request.get_json()
    mid  = d.get('match_id')
    pids = d.get('player_ids', [])
    cap  = d.get('captain_id')
    vc   = d.get('vice_captain_id')

    # Validate
    match = db_query('SELECT status FROM matches WHERE id=%s', (mid,), fetch='one')
    if not match: return jsonify({'error': 'Match not found'}), 404
    if match['status'] in ('live','completed'):
        return jsonify({'error': 'Match already started — team locked'}), 400
    if len(pids) != 11:
        return jsonify({'error': 'Select exactly 11 players'}), 422
    if cap not in pids or vc not in pids or cap == vc:
        return jsonify({'error': 'Invalid captain/vice-captain selection'}), 422

    players = db_query(f"""
        SELECT id, credits, is_overseas, ipl_team_id FROM players
        WHERE id = ANY(%s) AND is_active = TRUE
    """, (pids,))
    if len(players) != 11:
        return jsonify({'error': 'Invalid player selection'}), 422

    total_credits = sum(float(p['credits']) for p in players)
    if total_credits > 100:
        return jsonify({'error': f'Over budget: {total_credits:.1f}/100 Cr'}), 422

    overseas = sum(1 for p in players if p['is_overseas'])
    if overseas > 4:
        return jsonify({'error': 'Max 4 overseas players'}), 422

    from collections import Counter
    team_counts = Counter(p['ipl_team_id'] for p in players)
    if max(team_counts.values()) > 7:
        return jsonify({'error': 'Max 7 players from same IPL team'}), 422

    # Check existing locked team
    existing = db_query('SELECT id, is_locked FROM fantasy_teams WHERE user_id=%s AND match_id=%s',
                        (uid, mid), fetch='one')
    if existing and existing['is_locked']:
        return jsonify({'error': 'Team is locked'}), 400

    if existing:
        ft_id = existing['id']
        db_execute('UPDATE fantasy_teams SET captain_id=%s, vice_captain_id=%s, team_name=%s, updated_at=NOW() WHERE id=%s',
                   (cap, vc, d.get('team_name','My Dream XI'), ft_id))
        db_execute('DELETE FROM fantasy_team_players WHERE fantasy_team_id=%s', (ft_id,))
    else:
        row   = db_execute("""
            INSERT INTO fantasy_teams (user_id, match_id, team_name, captain_id, vice_captain_id)
            VALUES (%s,%s,%s,%s,%s) RETURNING id
        """, (uid, mid, d.get('team_name','My Dream XI'), cap, vc))
        ft_id = row['id']

    # Insert players
    conn = get_db()
    try:
        with conn.cursor() as cur:
            for pid in pids:
                cur.execute('INSERT INTO fantasy_team_players (fantasy_team_id, player_id) VALUES (%s,%s)', (ft_id, pid))
        conn.commit()
    finally:
        conn.close()

    return jsonify({'message': 'Team saved', 'team_id': ft_id}), 201


@app.get('/api/teams/my')
@jwt_required()
def my_teams():
    uid  = get_jwt_identity()
    rows = db_query("""
        SELECT ft.*, m.scheduled_at, m.status AS match_status,
               t1.short_code AS team1, t2.short_code AS team2,
               cp.full_name AS captain_name, vc.full_name AS vc_name
        FROM fantasy_teams ft
        JOIN matches m ON m.id = ft.match_id
        LEFT JOIN ipl_teams t1 ON t1.id = m.team1_id
        LEFT JOIN ipl_teams t2 ON t2.id = m.team2_id
        LEFT JOIN players cp ON cp.id = ft.captain_id
        LEFT JOIN players vc ON vc.id = ft.vice_captain_id
        WHERE ft.user_id = %s ORDER BY ft.created_at DESC
    """, (uid,))
    return jsonify([dict(r) for r in rows])

# ══════════════════════════════════════════════════════════════
# SCORES / ADMIN
# ══════════════════════════════════════════════════════════════
def _compute_points(d):
    pts = 4 if d.get('is_playing_xi', True) else 0
    runs = d.get('runs_scored', 0)
    pts += runs + d.get('fours', 0) + d.get('sixes', 0) * 2
    if runs >= 100: pts += 16
    elif runs >= 50: pts += 8
    if runs == 0: pts -= 2
    sr = d.get('strike_rate', 0) or 0
    if sr >= 170: pts += 6
    elif sr >= 150: pts += 4
    elif 0 < sr < 70: pts -= 6
    wkts = d.get('wickets', 0)
    pts += wkts * 25 + d.get('maidens', 0) * 8
    if wkts >= 5: pts += 8
    elif wkts >= 3: pts += 4
    eco = d.get('economy_rate', 0) or 0
    if d.get('overs_bowled', 0) >= 2:
        if eco < 5: pts += 6
        elif eco < 7: pts += 4
        elif eco > 12: pts -= 6
        elif eco > 10: pts -= 4
    pts += d.get('catches', 0) * 8 + d.get('stumpings', 0) * 12
    pts += d.get('run_outs_direct', 0) * 12 + d.get('run_outs_indirect', 0) * 6
    if d.get('catches', 0) + d.get('stumpings', 0) >= 3: pts += 4
    if d.get('is_motm', False): pts += 15
    return max(pts, 0)


@app.post('/api/scores/preview')
def preview_points():
    d = request.get_json()
    pts = _compute_points(d)
    return jsonify({'fantasy_points': pts, 'breakdown': {
        'playing_xi': 4 if d.get('is_playing_xi', True) else 0,
        'batting': d.get('runs_scored',0) + d.get('fours',0) + d.get('sixes',0)*2,
        'bowling': d.get('wickets',0)*25 + d.get('maidens',0)*8,
        'fielding': d.get('catches',0)*8 + d.get('stumpings',0)*12,
        'motm': 15 if d.get('is_motm') else 0,
        'total': pts
    }})


@app.post('/api/scores/add')
@admin_required
def add_score():
    d      = request.get_json()
    mid    = d.get('match_id')
    pid    = d.get('player_id')
    points = _compute_points(d)

    db_execute("""
        INSERT INTO player_performances
            (match_id, player_id, runs_scored, balls_faced, fours, sixes, strike_rate,
             is_duck, overs_bowled, wickets, runs_conceded, economy_rate, maidens,
             catches, stumpings, run_outs_direct, run_outs_indirect,
             is_playing_xi, is_motm, fantasy_points)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        ON CONFLICT (match_id, player_id) DO UPDATE SET
            runs_scored=EXCLUDED.runs_scored, wickets=EXCLUDED.wickets,
            catches=EXCLUDED.catches, stumpings=EXCLUDED.stumpings,
            fantasy_points=EXCLUDED.fantasy_points, calculated_at=NOW()
    """, (mid, pid, d.get('runs_scored',0), d.get('balls_faced',0),
          d.get('fours',0), d.get('sixes',0), d.get('strike_rate'),
          d.get('runs_scored',0)==0, d.get('overs_bowled',0), d.get('wickets',0),
          d.get('runs_conceded',0), d.get('economy_rate'), d.get('maidens',0),
          d.get('catches',0), d.get('stumpings',0), d.get('run_outs_direct',0),
          d.get('run_outs_indirect',0), d.get('is_playing_xi',True),
          d.get('is_motm',False), points))

    db_execute("""
        UPDATE players SET season_points = season_points + %s,
        matches_played = matches_played + 1 WHERE id = %s
    """, (points, pid))
    return jsonify({'fantasy_points': points}), 201


@app.post('/api/scores/calculate/<int:mid>')
@admin_required
def calculate_match(mid):
    perfs = db_query('SELECT player_id, fantasy_points FROM player_performances WHERE match_id=%s', (mid,))
    pts_map = {p['player_id']: p['fantasy_points'] for p in perfs}

    teams = db_query("""
        SELECT ft.id, ft.captain_id, ft.vice_captain_id,
               array_agg(ftp.player_id) AS player_ids
        FROM fantasy_teams ft
        JOIN fantasy_team_players ftp ON ftp.fantasy_team_id = ft.id
        WHERE ft.match_id = %s
        GROUP BY ft.id, ft.captain_id, ft.vice_captain_id
    """, (mid,))

    results = []
    for ft in teams:
        total = 0
        for pid in ft['player_ids']:
            base = pts_map.get(pid, 0)
            if pid == ft['captain_id']:         earned = base * 2
            elif pid == ft['vice_captain_id']:  earned = int(base * 1.5)
            else:                               earned = base
            db_execute('UPDATE fantasy_team_players SET points_earned=%s WHERE fantasy_team_id=%s AND player_id=%s',
                       (earned, ft['id'], pid))
            total += earned
        db_execute('UPDATE fantasy_teams SET total_points=%s WHERE id=%s', (total, ft['id']))
        results.append({'team_id': ft['id'], 'points': total})

    results.sort(key=lambda x: x['points'], reverse=True)
    for i, r in enumerate(results):
        db_execute('UPDATE fantasy_teams SET rank=%s WHERE id=%s', (i+1, r['team_id']))
        r['rank'] = i + 1

    db_execute("UPDATE matches SET status='completed', updated_at=NOW() WHERE id=%s", (mid,))
    return jsonify({'teams_updated': len(results), 'results': results})

# ══════════════════════════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════════════════════════
@app.get('/api/leaderboard/season')
def season_lb():
    limit = min(int(request.args.get('limit', 50)), 200)
    rows  = db_query("""
        SELECT p.username, p.display_name, p.avatar_emoji,
               SUM(ft.total_points)::int AS total_points,
               COUNT(ft.id)::int         AS matches_played
        FROM profiles p
        JOIN fantasy_teams ft ON ft.user_id = p.id
        GROUP BY p.username, p.display_name, p.avatar_emoji
        ORDER BY total_points DESC
        LIMIT %s
    """, (limit,))
    return jsonify([{**dict(r), 'rank': i+1} for i, r in enumerate(rows)])


@app.get('/api/leaderboard/match/<int:mid>')
def match_lb(mid):
    rows = db_query("""
        SELECT ft.id, ft.team_name, ft.total_points, ft.rank,
               p.username, p.display_name, p.avatar_emoji,
               cp.full_name AS captain_name
        FROM fantasy_teams ft
        JOIN profiles p ON p.id = ft.user_id
        LEFT JOIN players cp ON cp.id = ft.captain_id
        WHERE ft.match_id = %s
        ORDER BY ft.total_points DESC
        LIMIT 100
    """, (mid,))
    return jsonify([{**dict(r), 'rank': i+1} for i, r in enumerate(rows)])

# ══════════════════════════════════════════════════════════════
# LIVE CRICKET API
# ══════════════════════════════════════════════════════════════
@app.get('/api/cricket/live')
def live_scores():
    if not CRICAPI_KEY:
        return jsonify({'error': 'Cricket API key not configured', 'live': []})
    try:
        r = requests.get(f'https://api.cricapi.com/v1/currentMatches',
                         params={'apikey': CRICAPI_KEY, 'offset': 0}, timeout=8)
        data = r.json()
        ipl  = [m for m in data.get('data',[]) if 'premier league' in m.get('name','').lower()]
        return jsonify({'live': ipl})
    except Exception as e:
        return jsonify({'error': str(e), 'live': []})


@app.get('/api/cricket/fixtures')
def fixtures():
    if not CRICAPI_KEY:
        return jsonify({'fixtures': []})
    try:
        r = requests.get('https://api.cricapi.com/v1/matches',
                         params={'apikey': CRICAPI_KEY, 'offset': 0}, timeout=8)
        data = r.json()
        ipl  = [m for m in data.get('data',[]) if 'premier league' in m.get('name','').lower()]
        return jsonify({'fixtures': ipl})
    except Exception as e:
        return jsonify({'error': str(e), 'fixtures': []})


# ══════════════════════════════════════════════════════════════
# IPL TEAMS
# ══════════════════════════════════════════════════════════════
@app.get('/api/teams-list')
def ipl_teams():
    rows = db_query('SELECT * FROM ipl_teams ORDER BY name')
    return jsonify([dict(r) for r in rows])


if __name__ == '__main__':
    app.run(debug=False)
