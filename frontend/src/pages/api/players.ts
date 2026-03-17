// pages/api/players.ts — Add new player (admin only)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, isAdmin, createAdminClient } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })
  if (!(await isAdmin(authUser.id))) return res.status(403).json({ error: 'Admin only' })

  const db = createAdminClient()
  const d = req.body

  // Look up team by short_code
  let teamId = null
  if (d.team_code) {
    const { data: team } = await db.from('ipl_teams').select('id').eq('short_code', d.team_code).single()
    teamId = team?.id || null
  }

  const { data, error } = await db.from('players').insert({
    full_name: d.full_name,
    short_name: d.short_name || null,
    ipl_team_id: teamId,
    role: d.role,
    nationality: d.nationality || 'India',
    is_overseas: d.is_overseas || false,
    credits: d.credits || 8.0,
    emoji: d.emoji || '🏏',
  }).select('id').single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ id: data.id, message: 'Player added' })
}
