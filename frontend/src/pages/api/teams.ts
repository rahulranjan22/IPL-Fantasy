// pages/api/teams.ts — Save/update fantasy team (with validation)
import type { NextApiRequest, NextApiResponse } from 'next'
import { getUserFromRequest, createAdminClient } from '../../lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getUserFromRequest(req.headers.authorization)
  if (!authUser) return res.status(401).json({ error: 'Unauthorized' })

  const db = createAdminClient()
  const { match_id, player_ids, captain_id, vice_captain_id, team_name } = req.body

  // Validate match exists and is not locked
  const { data: match } = await db.from('matches').select('status').eq('id', match_id).single()
  if (!match) return res.status(404).json({ error: 'Match not found' })
  if (match.status === 'live' || match.status === 'completed') {
    return res.status(400).json({ error: 'Match already started — team locked' })
  }

  // Validate squad size
  if (!Array.isArray(player_ids) || player_ids.length !== 11) {
    return res.status(422).json({ error: 'Select exactly 11 players' })
  }

  // Validate captain/VC
  if (!player_ids.includes(captain_id) || !player_ids.includes(vice_captain_id) || captain_id === vice_captain_id) {
    return res.status(422).json({ error: 'Invalid captain/vice-captain selection' })
  }

  // Fetch selected players
  const { data: players } = await db
    .from('players')
    .select('id, credits, is_overseas, ipl_team_id')
    .in('id', player_ids)
    .eq('is_active', true)

  if (!players || players.length !== 11) {
    return res.status(422).json({ error: 'Invalid player selection' })
  }

  // Budget check
  const totalCredits = players.reduce((sum, p) => sum + Number(p.credits), 0)
  if (totalCredits > 100) {
    return res.status(422).json({ error: `Over budget: ${totalCredits.toFixed(1)}/100 Cr` })
  }

  // Overseas check
  const overseas = players.filter(p => p.is_overseas).length
  if (overseas > 4) {
    return res.status(422).json({ error: 'Max 4 overseas players' })
  }

  // Same team check
  const teamCounts: Record<string, number> = {}
  players.forEach(p => { teamCounts[p.ipl_team_id] = (teamCounts[p.ipl_team_id] || 0) + 1 })
  if (Math.max(...Object.values(teamCounts)) > 7) {
    return res.status(422).json({ error: 'Max 7 players from same IPL team' })
  }

  // Check existing team
  const { data: existing } = await db
    .from('fantasy_teams')
    .select('id, is_locked')
    .eq('user_id', authUser.id)
    .eq('match_id', match_id)
    .maybeSingle()

  if (existing?.is_locked) {
    return res.status(400).json({ error: 'Team is locked' })
  }

  let ftId: number

  if (existing) {
    // Update existing team
    ftId = existing.id
    await db.from('fantasy_teams').update({
      captain_id, vice_captain_id, team_name: team_name || 'My Dream XI', updated_at: new Date().toISOString(),
    }).eq('id', ftId)
    await db.from('fantasy_team_players').delete().eq('fantasy_team_id', ftId)
  } else {
    // Create new team
    const { data: newTeam, error } = await db.from('fantasy_teams').insert({
      user_id: authUser.id, match_id, team_name: team_name || 'My Dream XI', captain_id, vice_captain_id,
    }).select('id').single()
    if (error || !newTeam) return res.status(500).json({ error: 'Failed to create team' })
    ftId = newTeam.id
  }

  // Insert players
  const playerRows = player_ids.map((pid: number) => ({ fantasy_team_id: ftId, player_id: pid }))
  const { error: insertErr } = await db.from('fantasy_team_players').insert(playerRows)
  if (insertErr) return res.status(500).json({ error: 'Failed to save players' })

  return res.status(201).json({ message: 'Team saved', team_id: ftId })
}
