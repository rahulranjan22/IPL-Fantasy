// lib/api.ts  — all API calls to Flask backend + Supabase

import { createClient } from '@supabase/supabase-js'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

// ── Supabase client (for auth UI) ──────────────────────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON!
)

// ── Auth token store ───────────────────────────────────────────
export const getToken  = () => typeof window !== 'undefined' ? localStorage.getItem('ipl_token') : null
export const setToken  = (t: string) => localStorage.setItem('ipl_token', t)
export const clearToken= () => localStorage.removeItem('ipl_token')

// ── Base fetch ─────────────────────────────────────────────────
async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (res.status === 401) { clearToken(); window.location.href = '/login' }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'API error')
  return data
}

// ── Auth ───────────────────────────────────────────────────────
export const auth = {
  register: (body: any) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body: any) => apiFetch('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()          => apiFetch('/api/auth/me'),
  refresh:  ()          => apiFetch('/api/auth/refresh',  { method: 'POST' }),
}

// ── Players ────────────────────────────────────────────────────
export const players = {
  list:   (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : ''
    return apiFetch(`/api/players${q}`)
  },
  top:    (limit = 10) => apiFetch(`/api/players/top?limit=${limit}`),
  get:    (id: number) => apiFetch(`/api/players/${id}`),
  add:    (body: any)  => apiFetch('/api/players', { method: 'POST', body: JSON.stringify(body) }),
}

// ── Matches ────────────────────────────────────────────────────
export const matches = {
  list:     (status?: string) => apiFetch(`/api/matches${status ? `?status=${status}` : ''}`),
  get:      (id: number)      => apiFetch(`/api/matches/${id}`),
  live:     ()                => apiFetch('/api/cricket/live'),
  create:   (body: any)       => apiFetch('/api/matches',      { method: 'POST',  body: JSON.stringify(body) }),
  update:   (id: number, b: any) => apiFetch(`/api/matches/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
}

// ── Fantasy Teams ──────────────────────────────────────────────
export const teams = {
  save: (body: any) => apiFetch('/api/teams', { method: 'POST', body: JSON.stringify(body) }),
  mine: ()          => apiFetch('/api/teams/my'),
}

// ── Scores ─────────────────────────────────────────────────────
export const scores = {
  preview:   (body: any)       => apiFetch('/api/scores/preview',  { method: 'POST', body: JSON.stringify(body) }),
  add:       (body: any)       => apiFetch('/api/scores/add',      { method: 'POST', body: JSON.stringify(body) }),
  calculate: (matchId: number) => apiFetch(`/api/scores/calculate/${matchId}`, { method: 'POST' }),
  forMatch:  (matchId: number) => apiFetch(`/api/scores/${matchId}`),
}

// ── Leaderboard ────────────────────────────────────────────────
export const leaderboard = {
  season: (limit = 50)    => apiFetch(`/api/leaderboard/season?limit=${limit}`),
  match:  (matchId: number) => apiFetch(`/api/leaderboard/match/${matchId}`),
}

// ── IPL Teams list ─────────────────────────────────────────────
export const iplTeams = () => apiFetch('/api/teams-list')
