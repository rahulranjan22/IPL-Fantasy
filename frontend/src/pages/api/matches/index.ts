// pages/api/matches/index.ts — Create match (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, isAdmin, createAdminClient } from '../../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await isAdmin(authUser.id))) return res.status(403).json({ error: 'Admin only' })

  const db = createAdminClient()
  const d = req.body

  const { data: t1 } = await db.from('ipl_teams').select('id').eq('short_code', d.team1).single()
  const { data: t2 } = await db.from('ipl_teams').select('id').eq('short_code', d.team2).single()

  if (!t1 || !t2) return res.status(400).json({ error: 'Invalid team codes' })

  const { data, error } = await db.from('matches').insert({
    match_number: d.match_number || null,
    team1_id: t1.id,
    team2_id: t2.id,
    venue: d.venue || null,
    city: d.city || null,
    scheduled_at: d.scheduled_at,
    external_match_id: d.external_match_id || null,
  }).select('id').single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ id: data.id })
}
