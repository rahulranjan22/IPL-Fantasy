// pages/api/scores/preview.ts — Preview fantasy points (no auth needed)
import type { NextApiRequest, NextApiResponse } from 'next'

export function computePoints(d: any): number {
  let pts = d.is_playing_xi !== false ? 4 : 0
  const runs = d.runs_scored || 0
  pts += runs + (d.fours || 0) + (d.sixes || 0) * 2
  if (runs >= 100) pts += 16
  else if (runs >= 50) pts += 8
  if (runs === 0) pts -= 2
  const sr = d.strike_rate || 0
  if (sr >= 170) pts += 6
  else if (sr >= 150) pts += 4
  else if (sr > 0 && sr < 70) pts -= 6
  const wkts = d.wickets || 0
  pts += wkts * 25 + (d.maidens || 0) * 8
  if (wkts >= 5) pts += 8
  else if (wkts >= 3) pts += 4
  const eco = d.economy_rate || 0
  if ((d.overs_bowled || 0) >= 2) {
    if (eco < 5) pts += 6
    else if (eco < 7) pts += 4
    else if (eco > 12) pts -= 6
    else if (eco > 10) pts -= 4
  }
  pts += (d.catches || 0) * 8 + (d.stumpings || 0) * 12
  pts += (d.run_outs_direct || 0) * 12 + (d.run_outs_indirect || 0) * 6
  if ((d.catches || 0) + (d.stumpings || 0) >= 3) pts += 4
  if (d.is_motm) pts += 15
  return Math.max(pts, 0)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const d = req.body
  const pts = computePoints(d)

  return res.json({
    fantasy_points: pts,
    breakdown: {
      playing_xi: d.is_playing_xi !== false ? 4 : 0,
      batting: (d.runs_scored || 0) + (d.fours || 0) + (d.sixes || 0) * 2,
      bowling: (d.wickets || 0) * 25 + (d.maidens || 0) * 8,
      fielding: (d.catches || 0) * 8 + (d.stumpings || 0) * 12,
      motm: d.is_motm ? 15 : 0,
      total: pts,
    },
  })
}
