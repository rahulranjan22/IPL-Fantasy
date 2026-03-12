'use client'
// pages/leaderboard/index.tsx — Season & Match Rankings
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, Spinner, StatBox, EmptyState, Avatar } from '../../components/ui'
import { leaderboard as lbApi, matches as matchesApi } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

type LBEntry = {
  rank: number; username: string; display_name: string; avatar_emoji: string
  total_points: number; matches_played: number; avg_points: number
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const { user }  = useAuthStore()
  const [data, setData]     = useState<LBEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView]     = useState<'season'|'match'>('season')
  const [matches, setMatches] = useState<any[]>([])
  const [selMatch, setSelMatch] = useState<number|null>(null)
  const [matchLB, setMatchLB]  = useState<any[]>([])
  const [mlLoading, setMlLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      lbApi.season(),
      matchesApi.list('completed'),
    ]).then(([lb, m]) => {
      setData(lb)
      setMatches(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const loadMatchLB = (mid: number) => {
    setSelMatch(mid); setMlLoading(true)
    lbApi.match(mid).then(d => { setMatchLB(d); setMlLoading(false) }).catch(() => setMlLoading(false))
  }

  // Find logged-in user's rank
  const myRank = user ? data.find(r => r.username === user.username) : null

  const rows = view === 'season' ? data : matchLB

  return (
    <Layout>
      <div className="container" style={{ padding:'2rem 1.5rem' }}>
        <SectionTitle accent="🏆">RANKINGS</SectionTitle>

        {/* My position */}
        {myRank && (
          <div style={{ background:'rgba(255,215,0,0.07)', border:'1px solid rgba(255,215,0,0.2)',
                        borderRadius:12, padding:'16px 20px', marginBottom:24,
                        display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <Avatar emoji={user?.avatar_emoji || '🏏'} size={44} />
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700 }}>Your Position</div>
              <div style={{ color:'var(--muted)', fontSize:'0.85rem' }}>{user?.display_name}</div>
            </div>
            <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--gold)', lineHeight:1 }}>#{myRank.rank}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:1 }}>RANK</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--orange)', lineHeight:1 }}>{myRank.total_points}</div>
                <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:1 }}>POINTS</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 podium */}
        {!loading && data.length >= 3 && view === 'season' && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:28 }}>
            {[data[1], data[0], data[2]].map((r, i) => {
              const actualRank = i === 0 ? 2 : i === 1 ? 1 : 3
              const medal = MEDALS[actualRank - 1]
              return r ? (
                <div key={r.username} style={{
                  background: actualRank === 1 ? 'rgba(255,215,0,0.08)' : 'var(--card)',
                  border: `1px solid ${actualRank === 1 ? 'rgba(255,215,0,0.3)' : 'var(--border)'}`,
                  borderRadius:14, padding:'1.5rem 1rem', textAlign:'center',
                  marginTop: actualRank === 1 ? 0 : 24,
                  transform: actualRank === 1 ? 'scale(1.04)' : 'none',
                }}>
                  <div style={{ fontSize:'2rem', marginBottom:4 }}>{medal}</div>
                  <Avatar emoji={r.avatar_emoji || '🏏'} size={48} bg={actualRank === 1 ? 'rgba(255,215,0,0.15)' : undefined} />
                  <div style={{ fontWeight:700, marginTop:8 }}>{r.display_name || r.username}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem',
                                color: actualRank===1?'var(--gold)':actualRank===2?'#C0C0C0':'#CD7F32',
                                marginTop:4 }}>
                    {r.total_points.toLocaleString()}
                  </div>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:1 }}>PTS</div>
                </div>
              ) : <div key={i} />
            })}
          </div>
        )}

        {/* View toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          <button onClick={() => setView('season')} style={{
            background: view==='season' ? 'rgba(255,107,0,0.15)' : 'var(--card)',
            border:`1px solid ${view==='season' ? 'var(--orange)' : 'var(--border)'}`,
            color: view==='season' ? 'var(--orange)' : 'var(--muted)',
            padding:'8px 20px', borderRadius:8, cursor:'pointer',
            fontFamily:'inherit', fontWeight:700, fontSize:'0.85rem', letterSpacing:1
          }}>🏆 Season Overall</button>
          <button onClick={() => setView('match')} style={{
            background: view==='match' ? 'rgba(255,107,0,0.15)' : 'var(--card)',
            border:`1px solid ${view==='match' ? 'var(--orange)' : 'var(--border)'}`,
            color: view==='match' ? 'var(--orange)' : 'var(--muted)',
            padding:'8px 20px', borderRadius:8, cursor:'pointer',
            fontFamily:'inherit', fontWeight:700, fontSize:'0.85rem', letterSpacing:1
          }}>📅 Per Match</button>

          {view === 'match' && (
            <select value={selMatch || ''} onChange={e => loadMatchLB(Number(e.target.value))}
              style={{ flex:'0 0 220px' }}>
              <option value="">Select a match</option>
              {matches.map((m: any) => (
                <option key={m.id} value={m.id}>{m.team1_code} vs {m.team2_code}</option>
              ))}
            </select>
          )}
        </div>

        {/* Table */}
        {loading || mlLoading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState emoji="🏆" title="No Rankings Yet"
            desc={view === 'match' ? "Select a match to see rankings" : "Play matches to appear on the leaderboard!"} />
        ) : (
          <Card style={{ padding:0, overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)', background:'rgba(255,215,0,0.03)' }}>
                    {['Rank','Player','Points', ...(view==='season' ? ['Matches','Avg/Match'] : ['Team','Captain'])].map(h => (
                      <th key={h} style={{ padding:'12px 18px', textAlign: h==='Rank'||h==='Points'?'center':'left',
                                           fontSize:'0.7rem', letterSpacing:2, color:'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any, i: number) => {
                    const isMe = user && r.username === user.username
                    return (
                      <tr key={r.username || r.team_id} style={{
                        borderBottom: '1px solid rgba(255,215,0,0.04)',
                        background: isMe ? 'rgba(255,215,0,0.04)' : undefined,
                        color: i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--text)',
                      }}>
                        <td style={{ padding:'13px 18px', textAlign:'center' }}>
                          {i < 3 ? (
                            <span style={{ fontSize:'1.1rem' }}>{MEDALS[i]}</span>
                          ) : (
                            <span style={{ color:'var(--muted)', fontFamily:'var(--font-mono)', fontSize:'0.85rem' }}>#{i+1}</span>
                          )}
                        </td>
                        <td style={{ padding:'13px 18px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <Avatar emoji={r.avatar_emoji || '🏏'} size={32} />
                            <div>
                              <div style={{ fontWeight:700 }}>{r.display_name || r.username || r.team_name}</div>
                              {isMe && <span style={{ fontSize:'0.68rem', color:'var(--orange)', fontWeight:700 }}>YOU</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'13px 18px', textAlign:'center' }}>
                          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'1.1rem',
                                         color: i===0?'var(--gold)':'inherit' }}>
                            {(r.total_points || 0).toLocaleString()}
                          </span>
                        </td>
                        {view === 'season' ? (
                          <>
                            <td style={{ padding:'13px 18px', color:'var(--muted)', textAlign:'left' }}>{r.matches_played}</td>
                            <td style={{ padding:'13px 18px', color:'var(--orange)', fontWeight:700 }}>{r.avg_points}</td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding:'13px 18px', color:'var(--muted)' }}>{r.team_name}</td>
                            <td style={{ padding:'13px 18px', color:'var(--orange)' }}>{r.captain_name}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}
