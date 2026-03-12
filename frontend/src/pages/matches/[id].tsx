'use client'
// pages/matches/[id].tsx — Match Detail + Scorecard + Leaderboard
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, StatBox, Spinner, MatchStatus, Badge, RoleBadge } from '../../components/ui'
import { matches as matchesApi, scores as scoresApi, leaderboard as lbApi } from '../../lib/api'
import type { Match } from '../../components/ui/MatchCard'
import Link from 'next/link'
import { Button } from '../../components/ui'

type Perf = {
  id: number; player_id: number; player_name: string
  runs_scored: number; wickets: number; catches: number; stumpings: number
  fours: number; sixes: number; strike_rate: number; economy_rate: number
  overs_bowled: number; fantasy_points: number; is_motm: boolean
}
type LBEntry = { rank: number; team_name: string; username: string; display_name: string; total_points: number; captain_name: string }

export default function MatchDetailPage() {
  const router   = useRouter()
  const { id }   = router.query
  const [match, setMatch]   = useState<Match | null>(null)
  const [perfs, setPerfs]   = useState<Perf[]>([])
  const [lb, setLb]         = useState<LBEntry[]>([])
  const [activeTab, setActiveTab] = useState<'scorecard'|'leaderboard'>('scorecard')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      matchesApi.get(Number(id)),
      scoresApi.forMatch(Number(id)),
    ]).then(([m, s]) => {
      setMatch(m)
      setPerfs(s.performances || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const loadLB = () => {
    if (!id) return
    lbApi.match(Number(id)).then(setLb).catch(() => {})
  }

  if (loading) return <Layout><Spinner /></Layout>
  if (!match)  return <Layout><div className="container" style={{padding:'3rem'}}>Match not found</div></Layout>

  const batters = perfs.filter(p => p.runs_scored > 0).sort((a,b) => b.runs_scored - a.runs_scored)
  const bowlers = perfs.filter(p => p.wickets > 0 || p.overs_bowled > 0).sort((a,b) => b.wickets - a.wickets)

  return (
    <Layout>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>

        {/* Back */}
        <Link href="/matches" style={{ textDecoration:'none', color:'var(--muted)', fontSize:'0.85rem',
                                       display:'inline-flex', alignItems:'center', gap:6, marginBottom:16 }}>
          ← All Matches
        </Link>

        {/* Match header card */}
        <Card style={{ marginBottom: 24, padding: '2rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8, marginBottom:20 }}>
            <div>
              {match.match_number && (
                <span style={{ fontSize:'0.72rem', color:'var(--muted)', letterSpacing:2 }}>MATCH #{match.match_number}</span>
              )}
              <div style={{ fontSize:'0.72rem', color:'var(--muted)', marginTop:4 }}>
                {match.venue} {match.city && `· ${match.city}`}
              </div>
            </div>
            <MatchStatus status={match.status} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', gap:24 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'3.5rem' }}>{match.team1_emoji}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', marginTop:4 }}>{match.team1_name}</div>
              {match.team1_score && (
                <div style={{ fontFamily:'var(--font-mono)', color:'var(--gold)', fontSize:'1.3rem', marginTop:6 }}>
                  {match.team1_score}
                </div>
              )}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', color:'var(--muted)' }}>VS</div>
              {match.winner_name && (
                <div style={{ background:'rgba(255,215,0,0.1)', border:'1px solid rgba(255,215,0,0.2)',
                              borderRadius:8, padding:'6px 12px', marginTop:8 }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:2 }}>WINNER</div>
                  <div style={{ color:'var(--gold)', fontWeight:700 }}>🏆 {match.winner_name}</div>
                </div>
              )}
              {match.motm_name && (
                <div style={{ marginTop:8, fontSize:'0.78rem', color:'var(--orange)' }}>
                  ⭐ MOTM: {match.motm_name}
                </div>
              )}
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:'3.5rem' }}>{match.team2_emoji}</div>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', marginTop:4 }}>{match.team2_name}</div>
              {match.team2_score && (
                <div style={{ fontFamily:'var(--font-mono)', color:'var(--gold)', fontSize:'1.3rem', marginTop:6 }}>
                  {match.team2_score}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {(['scorecard', 'leaderboard'] as const).map(t => (
            <button key={t} onClick={() => { setActiveTab(t); if (t==='leaderboard') loadLB() }} style={{
              background: activeTab===t ? 'rgba(255,107,0,0.15)' : 'var(--card)',
              border: `1px solid ${activeTab===t ? 'var(--orange)' : 'var(--border)'}`,
              color: activeTab===t ? 'var(--orange)' : 'var(--muted)',
              padding:'8px 20px', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontWeight:700, fontSize:'0.85rem', letterSpacing:1, textTransform:'uppercase',
            }}>{t === 'scorecard' ? '📊 Scorecard' : '🏆 Fantasy Rankings'}</button>
          ))}
        </div>

        {/* SCORECARD */}
        {activeTab === 'scorecard' && (
          <div style={{ display:'grid', gap:20 }}>
            {/* Batting */}
            <Card>
              <SectionTitle accent="🏏">BATTING</SectionTitle>
              {batters.length === 0 ? (
                <p style={{ color:'var(--muted)' }}>No batting data yet</p>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Player','R','B','4s','6s','SR','Pts'].map(h => (
                          <th key={h} style={{ padding:'8px 12px', textAlign: h==='Player'?'left':'center',
                                               fontSize:'0.7rem', letterSpacing:2, color:'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {batters.map(p => (
                        <tr key={p.id} style={{ borderBottom:'1px solid rgba(255,215,0,0.04)' }}>
                          <td style={{ padding:'10px 12px', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                            {p.player_name}
                            {p.is_motm && <Badge color="gold">MOTM</Badge>}
                          </td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--gold)', fontFamily:'var(--font-mono)', fontWeight:700 }}>{p.runs_scored}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--muted)' }}>—</td>
                          <td style={{ padding:'10px 12px', textAlign:'center' }}>{p.fours}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--orange)' }}>{p.sixes}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--muted)', fontSize:'0.85rem' }}>{p.strike_rate?.toFixed(1)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--green)', fontFamily:'var(--font-mono)', fontWeight:700 }}>{p.fantasy_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Bowling */}
            <Card>
              <SectionTitle accent="⚡">BOWLING</SectionTitle>
              {bowlers.length === 0 ? (
                <p style={{ color:'var(--muted)' }}>No bowling data yet</p>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:'1px solid var(--border)' }}>
                        {['Player','O','W','R','Eco','Pts'].map(h => (
                          <th key={h} style={{ padding:'8px 12px', textAlign: h==='Player'?'left':'center',
                                               fontSize:'0.7rem', letterSpacing:2, color:'var(--muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bowlers.map(p => (
                        <tr key={p.id} style={{ borderBottom:'1px solid rgba(255,215,0,0.04)' }}>
                          <td style={{ padding:'10px 12px', fontWeight:700 }}>{p.player_name}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--muted)' }}>{p.overs_bowled}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--gold)', fontFamily:'var(--font-mono)', fontWeight:700 }}>{p.wickets}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center' }}>{p.runs_scored}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color: (p.economy_rate > 10) ? 'var(--red)' : (p.economy_rate < 7 ? 'var(--green)' : 'var(--muted)') }}>{p.economy_rate?.toFixed(1)}</td>
                          <td style={{ padding:'10px 12px', textAlign:'center', color:'var(--green)', fontFamily:'var(--font-mono)', fontWeight:700 }}>{p.fantasy_points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <Card>
            <SectionTitle accent="🏆">FANTASY RANKINGS</SectionTitle>
            {lb.length === 0 ? (
              <div style={{ textAlign:'center', padding:'3rem', color:'var(--muted)' }}>
                <div style={{ fontSize:'2rem', marginBottom:8 }}>📋</div>
                No teams submitted yet for this match
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['#','Team','Manager','Captain','Points'].map(h => (
                        <th key={h} style={{ padding:'8px 14px', textAlign: h==='#'||h==='Points'?'center':'left',
                                             fontSize:'0.7rem', letterSpacing:2, color:'var(--muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lb.map((r, i) => (
                      <tr key={r.username} style={{
                        borderBottom: '1px solid rgba(255,215,0,0.04)',
                        color: i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--text)',
                      }}>
                        <td style={{ padding:'12px 14px', textAlign:'center' }}>
                          <span style={{
                            background: i===0?'var(--gold)':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--card2)',
                            color: i<3?'#000':'var(--muted)',
                            width:26, height:26, borderRadius:'50%',
                            display:'inline-flex', alignItems:'center', justifyContent:'center',
                            fontSize:'0.75rem', fontWeight:700,
                          }}>{r.rank}</span>
                        </td>
                        <td style={{ padding:'12px 14px', fontWeight:700 }}>{r.team_name}</td>
                        <td style={{ padding:'12px 14px', color:'var(--muted)' }}>{r.display_name || r.username}</td>
                        <td style={{ padding:'12px 14px', color:'var(--orange)' }}>{r.captain_name}</td>
                        <td style={{ padding:'12px 14px', textAlign:'center', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--gold)', fontSize:'1.05rem' }}>
                          {r.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </Layout>
  )
}
