// pages/api/cricket/fixtures.ts — Proxy to CricAPI for fixtures
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const CRICAPI_KEY = process.env.CRICAPI_KEY
  if (!CRICAPI_KEY) return res.json({ fixtures: [] })

  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/matches?apikey=${CRICAPI_KEY}&offset=0`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await r.json()
    const ipl = (data.data || []).filter(
      (m: any) => m.name?.toLowerCase().includes('premier league')
    )
    return res.json({ fixtures: ipl })
  } catch (e: any) {
    return res.json({ error: e.message, fixtures: [] })
  }
}
