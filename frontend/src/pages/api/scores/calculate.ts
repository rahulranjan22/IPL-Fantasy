// pages/api/scores/calculate.ts — Calculate match fantasy points (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, isAdmin, createAdminClient } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await isAdmin(authUser.id))) return res.status(403).json({ error: 'Admin only' })

  const db = createAdminClient()
  const mid = req.body.match_id
  if (!mid) return res.status(400).json({ error: 'match_id required' })

  // Get all performances for this match
  const { data: perfs } = await db
    .from('player_performances')
    .select('player_id, fantasy_points')
    .eq('match_id', mid)

  const ptsMap: Record<number, number> = {}
  ;(perfs || []).forEach((p: any) => { ptsMap[p.player_id] = p.fantasy_points })

  // Get all fantasy teams for this match
  const { data: teams } = await db
    .from('fantasy_teams')
    .select('id, captain_id, vice_captain_id, fantasy_team_players(player_id)')
    .eq('match_id', mid)

  if (!teams || teams.length === 0) {
    return res.json({ teams_updated: 0, results: [] })
  }

  const results: { team_id: number; points: number; rank?: number }[] = []

  for (const ft of teams) {
    let total = 0
    const playerIds = (ft.fantasy_team_players || []).map((ftp: any) => ftp.player_id)

    for (const pid of playerIds) {
      const base = ptsMap[pid] || 0
      let earned = base
      if (pid === ft.captain_id) earned = base * 2
      else if (pid === ft.vice_captain_id) earned = Math.floor(base * 1.5)

      await db.from('fantasy_team_players')
        .update({ points_earned: earned })
        .eq('fantasy_team_id', ft.id)
        .eq('player_id', pid)

      total += earned
    }

    await db.from('fantasy_teams').update({ total_points: total }).eq('id', ft.id)
    results.push({ team_id: ft.id, points: total })
  }

  // Assign ranks
  results.sort((a, b) => b.points - a.points)
  for (let i = 0; i < results.length; i++) {
    results[i].rank = i + 1
    await db.from('fantasy_teams').update({ rank: i + 1 }).eq('id', results[i].team_id)
  }

  // Mark match as completed
  await db.from('matches').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', mid)

  return res.json({ teams_updated: results.length, results })
}
