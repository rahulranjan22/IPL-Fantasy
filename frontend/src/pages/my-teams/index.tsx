'use client'
// pages/my-teams/index.tsx — User's submitted fantasy teams
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, Spinner, EmptyState, Badge, Button, Avatar } from '../../components/ui'
import PlayerCard from '../../components/ui/PlayerCard'
import { teams as teamsApi } from '../../lib/api'
import { useAuthStore } from '../../lib/store'

export default function MyTeamsPage() {
  const { user } = useAuthStore()
  const [myTeams, setMyTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number|null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    teamsApi.mine().then(d => { setMyTeams(d); setLoading(false) }).catch(() => setLoading(false))
  }, [user])

  if (!user) return (
    <Layout>
      <div className="container" style={{ padding:'3rem 1.5rem' }}>
        <EmptyState emoji="🔒" title="Login Required" desc="Login to view your fantasy teams"
          action={<Link href="/teams/build" style={{ textDecoration:'none' }}><Button variant="gold">Login to Play</Button></Link>} />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="container" style={{ padding:'2rem 1.5rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
          <SectionTitle accent="📋">MY TEAMS</SectionTitle>
          <Link href="/teams/build" style={{ textDecoration:'none' }}>
            <Button variant="primary" size="sm">+ New Team</Button>
          </Link>
        </div>

        {loading ? <Spinner /> : myTeams.length === 0 ? (
          <EmptyState emoji="🏏" title="No Teams Yet" desc="Build your first Dream XI and start playing!"
            action={<Link href="/teams/build" style={{ textDecoration:'none' }}><Button variant="gold">Build My Team</Button></Link>} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {myTeams.map(t => (
              <Card key={t.id} style={{ padding:0, overflow:'hidden' }}>
                {/* Team header */}
                <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', gap:16,
                               borderBottom: expanded === t.id ? '1px solid var(--border)' : 'none',
                               cursor:'pointer' }}
                     onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', letterSpacing:2 }}>
                      {t.team_name}
                    </div>
                    <div style={{ color:'var(--muted)', fontSize:'0.82rem', marginTop:4 }}>
                      {t.team1} vs {t.team2} · {new Date(t.scheduled_at).toLocaleDateString('en-IN')}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                      <Badge color={t.match_status === 'live' ? 'green' : t.match_status === 'completed' ? 'muted' : 'orange'}>
                        {t.match_status}
                      </Badge>
                      {t.is_locked && <Badge color="red">🔒 Locked</Badge>}
                      {t.captain_name && <Badge color="gold">C: {t.captain_name}</Badge>}
                      {t.vc_name && <Badge color="orange">VC: {t.vc_name}</Badge>}
                    </div>
                  </div>

                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', lineHeight:1,
                                  color: t.total_points > 0 ? 'var(--gold)' : 'var(--muted)' }}>
                      {t.total_points || '—'}
                    </div>
                    {t.total_points > 0 && (
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:1 }}>POINTS</div>
                    )}
                    {t.rank && (
                      <div style={{ color:'var(--orange)', fontWeight:700, marginTop:4 }}>Rank #{t.rank}</div>
                    )}
                  </div>

                  <div style={{ color:'var(--muted)', fontSize:'1.2rem', transform: expanded===t.id ? 'rotate(180deg)' : 'none', transition:'transform 0.2s' }}>
                    ▾
                  </div>
                </div>

                {/* Expanded player list */}
                {expanded === t.id && (
                  <div style={{ padding:'16px 20px' }}>
                    {t.players && t.players.length > 0 ? (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
                        {t.players.map((tp: any) => tp.player && (
                          <PlayerCard key={tp.player.id} player={tp.player}
                            isCaptain={tp.player.id === t.captain_id}
                            isVC={tp.player.id === t.vice_captain_id}
                            selected
                          />
                        ))}
                      </div>
                    ) : (
                      <p style={{ color:'var(--muted)' }}>Player details not available</p>
                    )}
                    {!t.is_locked && (
                      <div style={{ marginTop:16 }}>
                        <Link href={`/teams/build?match=${t.match_id}`} style={{ textDecoration:'none' }}>
                          <Button variant="ghost" size="sm">✏️ Edit Team</Button>
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
