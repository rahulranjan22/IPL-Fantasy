// pages/api/scores/index.ts — Add player performance (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, isAdmin, createAdminClient } from '../../../lib/supabase'
import { computePoints } from './preview'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await isAdmin(authUser.id))) return res.status(403).json({ error: 'Admin only' })

  const db = createAdminClient()
  const d = req.body
  const mid = d.match_id
  const pid = d.player_id
  const points = computePoints(d)

  // Upsert performance
  const { error: upsertErr } = await db.from('player_performances').upsert({
    match_id: mid,
    player_id: pid,
    runs_scored: d.runs_scored || 0,
    balls_faced: d.balls_faced || 0,
    fours: d.fours || 0,
    sixes: d.sixes || 0,
    strike_rate: d.strike_rate || null,
    is_duck: (d.runs_scored || 0) === 0,
    overs_bowled: d.overs_bowled || 0,
    wickets: d.wickets || 0,
    runs_conceded: d.runs_conceded || 0,
    economy_rate: d.economy_rate || null,
    maidens: d.maidens || 0,
    catches: d.catches || 0,
    stumpings: d.stumpings || 0,
    run_outs_direct: d.run_outs_direct || 0,
    run_outs_indirect: d.run_outs_indirect || 0,
    is_playing_xi: d.is_playing_xi !== false,
    is_motm: d.is_motm || false,
    fantasy_points: points,
    calculated_at: new Date().toISOString(),
  }, { onConflict: 'match_id,player_id' })

  if (upsertErr) return res.status(500).json({ error: upsertErr.message })

  // Update player season stats
  await db.rpc('update_player_season_stats', { p_id: pid, pts: points })
    .then(() => {})
    .catch(async () => {
      // Fallback: manual update if RPC doesn't exist yet
      const { data: current } = await db.from('players').select('season_points, matches_played').eq('id', pid).single()
      if (current) {
        await db.from('players').update({
          season_points: (current.season_points || 0) + points,
          matches_played: (current.matches_played || 0) + 1,
        }).eq('id', pid)
      }
    })

  return res.status(201).json({ fantasy_points: points })
}
