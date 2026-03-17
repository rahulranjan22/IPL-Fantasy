// pages/api/cricket/live.ts — Proxy to CricAPI for live scores
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const CRICAPI_KEY = process.env.CRICAPI_KEY
  if (!CRICAPI_KEY) return res.json({ error: 'Cricket API key not configured', live: [] })

  try {
    const r = await fetch(
      `https://api.cricapi.com/v1/currentMatches?apikey=${CRICAPI_KEY}&offset=0`,
      { signal: AbortSignal.timeout(8000) }
    )
    const data = await r.json()
    const ipl = (data.data || []).filter(
      (m: any) => m.name?.toLowerCase().includes('premier league')
    )
    return res.json({ live: ipl })
  } catch (e: any) {
    return res.json({ error: e.message, live: [] })
  }
}
