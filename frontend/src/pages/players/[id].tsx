'use client'
// pages/players/[id].tsx — Player Profile
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, StatBox, Spinner, RoleBadge, Badge, Avatar, ProgressBar } from '../../components/ui'
import { players as playersApi } from '../../lib/api'

export default function PlayerDetailPage() {
  const { query } = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!query.id) return
    playersApi.get(Number(query.id))
      .then(p => { setPlayer(p); setLoading(false) })
      .catch(() => setLoading(false))
  }, [query.id])

  if (loading) return <Layout><Spinner /></Layout>
  if (!player) return <Layout><div className="container" style={{padding:'3rem'}}>Player not found</div></Layout>

  const perfs = player.recent_performances || []

  return (
    <Layout>
      <div className="container" style={{ padding:'2rem 1.5rem' }}>
        <Link href="/players" style={{ textDecoration:'none', color:'var(--muted)', fontSize:'0.85rem',
                                       display:'inline-flex', alignItems:'center', gap:6, marginBottom:16 }}>
          ← All Players
        </Link>

        {/* Profile header */}
        <Card style={{ marginBottom:24, padding:'2rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
            <Avatar emoji={player.emoji} size={80} />
            <div style={{ flex:1 }}>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem', letterSpacing:2 }}>{player.full_name}</h1>
              <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:8, flexWrap:'wrap' }}>
                <RoleBadge role={player.role} />
                {player.is_overseas && <Badge color="gold">🌍 Overseas</Badge>}
                {player.team && (
                  <span style={{ color:'var(--muted)', fontSize:'0.9rem' }}>
                    {player.team.emoji} {player.team.name}
                  </span>
                )}
                <span style={{ color:'var(--muted)', fontSize:'0.9rem' }}>{player.nationality}</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'3rem', color:'var(--gold)', lineHeight:1 }}>
                {player.credits} Cr
              </div>
              <div style={{ fontSize:'0.72rem', color:'var(--muted)', letterSpacing:2 }}>FANTASY CREDITS</div>
            </div>
          </div>
        </Card>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
          <StatBox label="Season Points"  value={player.season_points} accent />
          <StatBox label="Matches Played" value={player.matches_played} />
          <StatBox label="Avg Points"     value={player.avg_points} />
          <StatBox label="Credits"        value={`${player.credits} Cr`} />
        </div>

        {/* Recent form */}
        {perfs.length > 0 && (
          <Card style={{ marginBottom:24 }}>
            <SectionTitle accent="📊">RECENT FORM</SectionTitle>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['Match','Runs','Wkts','Catches','Pts'].map(h => (
                      <th key={h} style={{ padding:'8px 14px', textAlign: h==='Match'?'left':'center',
                                           fontSize:'0.7rem', letterSpacing:2, color:'var(--muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perfs.map((p: any) => (
                    <tr key={p.id} style={{ borderBottom:'1px solid rgba(255,215,0,0.04)' }}>
                      <td style={{ padding:'10px 14px', color:'var(--muted)', fontSize:'0.85rem' }}>
                        {p.vs_team || `Match #${p.match_id}`}
                      </td>
                      <td style={{ padding:'10px 14px', textAlign:'center', fontWeight:700, color: p.runs_scored>=50?'var(--gold)':'var(--text)' }}>
                        {p.runs_scored}
                        {p.runs_scored >= 100 && ' 💯'}
                        {p.runs_scored >= 50 && p.runs_scored < 100 && ' ⭐'}
                      </td>
                      <td style={{ padding:'10px 14px', textAlign:'center', color: p.wickets>=3?'var(--orange)':'var(--text)' }}>
                        {p.wickets}{p.wickets>=5 && ' 🔥'}
                      </td>
                      <td style={{ padding:'10px 14px', textAlign:'center', color:'var(--muted)' }}>{p.catches}</td>
                      <td style={{ padding:'10px 14px', textAlign:'center', fontFamily:'var(--font-mono)',
                                   fontWeight:700, color:'var(--green)', fontSize:'1.05rem' }}>
                        {p.fantasy_points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Credits bar comparison */}
        <Card>
          <SectionTitle>CREDIT VALUE</SectionTitle>
          <div style={{ marginBottom:12, fontSize:'0.9rem', color:'var(--muted)' }}>
            How this player's credits compare to the maximum (11 Cr)
          </div>
          <ProgressBar value={player.credits} max={11} color="gold" />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:'0.8rem', color:'var(--muted)' }}>
            <span>1 Cr (min)</span>
            <span style={{ color:'var(--gold)', fontWeight:700 }}>{player.credits} Cr</span>
            <span>11 Cr (max)</span>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
