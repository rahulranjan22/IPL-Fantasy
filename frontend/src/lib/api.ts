// lib/api.ts — Supabase direct queries + Next.js API routes

import { supabase } from './supabase'
import { useAuthStore } from './store'

// ── Helper: authenticated fetch to our own Next.js API routes ──
async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await useAuthStore.getState().getAccessToken()
  const res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

// Player select with team join
const PLAYER_SELECT = '*, ipl_teams(id, name, short_code, emoji, color_hex)'
const MATCH_SELECT = `
  *,
  team1:ipl_teams!matches_team1_id_fkey(id, name, short_code, emoji),
  team2:ipl_teams!matches_team2_id_fkey(id, name, short_code, emoji),
  winner:ipl_teams!matches_winner_team_id_fkey(id, name, short_code),
  motm_player:players!matches_motm_player_id_fkey(id, full_name)
`

// ── Players (direct Supabase) ───────────────────────────────
export const players = {
  list: async (params?: Record<string, string>) => {
    let query = supabase
      .from('players')
      .select(PLAYER_SELECT)
      .eq('is_active', true)

    if (params?.role) query = query.eq('role', params.role)
    if (params?.search) query = query.ilike('full_name', `%${params.search}%`)

    const sort = params?.sort || 'season_points'
    if (sort === 'credits') query = query.order('credits', { ascending: false })
    else if (sort === 'name') query = query.order('full_name', { ascending: true })
    else query = query.order('season_points', { ascending: false })

    const { data, error } = await query
    if (error) throw new Error(error.message)

    let results = (data || []).map(flattenPlayer)
    // Filter by team client-side (PostgREST can't filter on joined FK easily)
    if (params?.team) results = results.filter(p => p.short_code === params.team)
    return results
  },

  top: async (limit = 10) => {
    const { data, error } = await supabase
      .from('players')
      .select(PLAYER_SELECT)
      .eq('is_active', true)
      .order('season_points', { ascending: false })
      .limit(limit)
    if (error) throw new Error(error.message)
    return (data || []).map(flattenPlayer)
  },

  get: async (id: number) => {
    const { data: player, error } = await supabase
      .from('players')
      .select(PLAYER_SELECT)
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)

    const { data: recent } = await supabase
      .from('player_performances')
      .select('*, matches(scheduled_at, team1_id, team2_id)')
      .eq('player_id', id)
      .order('id', { ascending: false })
      .limit(5)

    const result = flattenPlayer(player)
    result.recent_performances = recent || []
    return result
  },

  add: (body: any) => apiFetch('/api/players', { method: 'POST', body: JSON.stringify(body) }),
}

// ── Matches (direct Supabase) ───────────────────────────────
export const matches = {
  list: async (status?: string) => {
    let query = supabase
      .from('matches')
      .select(MATCH_SELECT)

    if (status) query = query.eq('status', status)
    query = query.order('scheduled_at')

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map(flattenMatch)
  },

  get: async (id: number) => {
    const { data, error } = await supabase
      .from('matches')
      .select(MATCH_SELECT)
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    return flattenMatch(data)
  },

  live: () => apiFetch('/api/cricket/live'),

  create: (body: any) => apiFetch('/api/matches', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: any) => apiFetch(`/api/matches/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
}

// ── Fantasy Teams ───────────────────────────────────────────
export const teams = {
  save: (body: any) => apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(body) }),

  mine: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('fantasy_teams')
      .select(`
        *,
        matches(scheduled_at, status,
          team1:ipl_teams!matches_team1_id_fkey(short_code),
          team2:ipl_teams!matches_team2_id_fkey(short_code)
        ),
        captain:players!fantasy_teams_captain_id_fkey(full_name),
        vice_captain:players!fantasy_teams_vice_captain_id_fkey(full_name)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Flatten for compatibility
    return (data || []).map((ft: any) => ({
      ...ft,
      scheduled_at: ft.matches?.scheduled_at,
      match_status: ft.matches?.status,
      team1: ft.matches?.team1?.short_code,
      team2: ft.matches?.team2?.short_code,
      captain_name: ft.captain?.full_name,
      vc_name: ft.vice_captain?.full_name,
      matches: undefined,
      captain: undefined,
      vice_captain: undefined,
    }))
  },
}

// ── Scores ──────────────────────────────────────────────────
export const scores = {
  preview: (body: any) => apiFetch('/api/scores/preview', { method: 'POST', body: JSON.stringify(body) }),
  add: (body: any) => apiFetch('/api/scores', { method: 'POST', body: JSON.stringify(body) }),
  calculate: (matchId: number) => apiFetch('/api/scores/calculate', { method: 'POST', body: JSON.stringify({ match_id: matchId }) }),

  forMatch: async (matchId: number) => {
    const { data, error } = await supabase
      .from('player_performances')
      .select('*, players(full_name, short_name, role, ipl_teams(short_code, emoji))')
      .eq('match_id', matchId)
      .order('fantasy_points', { ascending: false })
    if (error) throw new Error(error.message)
    // Flatten and wrap in { performances } for page compatibility
    const performances = (data || []).map((p: any) => ({
      ...p,
      player_name: p.players?.full_name || '',
      player_short_name: p.players?.short_name || '',
      player_role: p.players?.role || '',
      team_code: p.players?.ipl_teams?.short_code || '',
      team_emoji: p.players?.ipl_teams?.emoji || '',
      players: undefined,
    }))
    return { performances }
  },
}

// ── Leaderboard (via Supabase RPC) ──────────────────────────
export const leaderboard = {
  season: async (limit = 50) => {
    const { data, error } = await supabase.rpc('season_leaderboard', { lim: limit })
    if (error) throw new Error(error.message)
    return (data || []).map((r: any, i: number) => ({
      ...r,
      rank: i + 1,
      avg_points: r.matches_played > 0 ? Math.round(r.total_points / r.matches_played) : 0,
    }))
  },

  match: async (matchId: number) => {
    const { data, error } = await supabase.rpc('match_leaderboard', { m_id: matchId })
    if (error) throw new Error(error.message)
    return (data || []).map((r: any, i: number) => ({ ...r, rank: i + 1 }))
  },
}

// ── IPL Teams (direct Supabase) ─────────────────────────────
export const iplTeams = async () => {
  const { data, error } = await supabase
    .from('ipl_teams')
    .select('*')
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

// ── Helpers: flatten joined data for component compatibility ─
function flattenPlayer(p: any) {
  const team = p.ipl_teams || {}
  return {
    ...p,
    team_name: team.name,
    short_code: team.short_code,
    team_emoji: team.emoji,
    color_hex: team.color_hex,
    ipl_teams: undefined,
  }
}

function flattenMatch(m: any) {
  return {
    ...m,
    team1_name: m.team1?.name,
    team1_code: m.team1?.short_code,
    team1_emoji: m.team1?.emoji,
    team2_name: m.team2?.name,
    team2_code: m.team2?.short_code,
    team2_emoji: m.team2?.emoji,
    winner_name: m.winner?.name,
    winner_code: m.winner?.short_code,
    motm_name: m.motm_player?.full_name,
    team1: undefined,
    team2: undefined,
    winner: undefined,
    motm_player: undefined,
  }
}
