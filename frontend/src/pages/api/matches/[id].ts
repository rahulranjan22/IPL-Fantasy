// pages/api/matches/[id].ts — Update match (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, isAdmin, createAdminClient } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await isAdmin(authUser.id))) return res.status(403).json({ error: 'Admin only' })

  const db = createAdminClient()
  const mid = Number(req.query.id)
  const d = req.body

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }

  if (d.status) updates.status = d.status
  if (d.team1_score) updates.team1_score = d.team1_score
  if (d.team2_score) updates.team2_score = d.team2_score
  if (d.venue) updates.venue = d.venue
  if (d.external_match_id) updates.external_match_id = d.external_match_id
  if (d.motm_player_id) updates.motm_player_id = d.motm_player_id

  if (d.winner) {
    const { data: w } = await db.from('ipl_teams').select('id').eq('short_code', d.winner).single()
    if (w) updates.winner_team_id = w.id
  }

  const { error } = await db.from('matches').update(updates).eq('id', mid)
  if (error) return res.status(500).json({ error: error.message })

  return res.json({ message: 'Updated' })
}
