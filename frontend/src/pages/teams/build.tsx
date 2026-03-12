'use client'
// pages/teams/build.tsx — Fantasy Team Builder
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, Spinner, Button, StatBox, ProgressBar, Badge, EmptyState } from '../../components/ui'
import PlayerCard, { Player } from '../../components/ui/PlayerCard'
import { players as playersApi, matches as matchesApi, teams as teamsApi, iplTeams } from '../../lib/api'
import { useAuthStore } from '../../lib/store'
import toast from 'react-hot-toast'

const ROLES = [
  { key: 'all', label: 'All' },
  { key: 'bat', label: '🏏 Batters' },
  { key: 'bowl', label: '⚡ Bowlers' },
  { key: 'ar', label: '💫 All-Rounders' },
  { key: 'wk', label: '🧤 Keepers' },
]

export default function BuildTeamPage() {
  const { user } = useAuthStore()
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [matches, setMatches]       = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  const [selected, setSelected]   = useState<number[]>([])
  const [captain, setCaptain]     = useState<number|null>(null)
  const [vc, setVc]               = useState<number|null>(null)
  const [teamName, setTeamName]   = useState('My Dream XI')
  const [matchId, setMatchId]     = useState<number|null>(null)

  const [roleFilter, setRoleFilter] = useState('all')
  const [teamFilter, setTeamFilter] = useState('')
  const [search, setSearch]         = useState('')
  const [saving, setSaving]         = useState(false)
  const [iplTeamsList, setIplTeamsList] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      playersApi.list(),
      matchesApi.list('upcoming'),
      iplTeams(),
    ]).then(([p, m, t]) => {
      setAllPlayers(p)
      setMatches(m)
      setIplTeamsList(t)
      if (m.length > 0) setMatchId(m[0].id)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const totalCredits = selected.reduce((sum, id) => {
    const p = allPlayers.find(x => x.id === id)
    return sum + (p ? Number(p.credits) : 0)
  }, 0)
  const remaining = +(100 - totalCredits).toFixed(1)

  const togglePlayer = (p: Player) => {
    if (selected.includes(p.id)) {
      setSelected(s => s.filter(x => x !== p.id))
      if (captain === p.id) setCaptain(null)
      if (vc === p.id) setVc(null)
    } else {
      if (selected.length >= 11) { toast.error('Max 11 players allowed'); return }
      if (totalCredits + Number(p.credits) > 100) { toast.error(`Not enough credits! (${remaining} Cr left)`); return }
      setSelected(s => [...s, p.id])
    }
  }

  const handleSave = async () => {
    if (!user) { toast.error('Please login first'); return }
    if (selected.length !== 11) { toast.error(`Select ${11 - selected.length} more player(s)`); return }
    if (!captain) { toast.error('Tap C button to set your Captain'); return }
    if (!vc) { toast.error('Tap VC button to set your Vice Captain'); return }
    if (!matchId) { toast.error('Select a match'); return }
    setSaving(true)
    try {
      await teamsApi.save({ match_id: matchId, player_ids: selected, captain_id: captain, vice_captain_id: vc, team_name: teamName })
      toast.success('🏆 Team saved successfully!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save team')
    } finally {
      setSaving(false)
    }
  }

  const filtered = allPlayers.filter(p =>
    (roleFilter === 'all' || p.role === roleFilter) &&
    (!teamFilter || p.short_code === teamFilter) &&
    (!search || p.full_name.toLowerCase().includes(search.toLowerCase()))
  )

  const selectedPlayers = selected.map(id => allPlayers.find(p => p.id === id)).filter(Boolean) as Player[]
  const roleCounts = { wk: 0, bat: 0, ar: 0, bowl: 0 }
  selectedPlayers.forEach(p => { roleCounts[p.role as keyof typeof roleCounts]++ })

  return (
    <Layout>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <SectionTitle accent="🏏">BUILD YOUR DREAM XI</SectionTitle>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* LEFT — player selection */}
          <div>
            {/* Match selector */}
            <Card style={{ marginBottom: 16, padding: '14px 18px' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:2, marginBottom:6 }}>SELECT MATCH</div>
                  <select value={matchId || ''} onChange={e => setMatchId(Number(e.target.value))}>
                    {matches.length === 0 && <option>No upcoming matches</option>}
                    {matches.map(m => <option key={m.id} value={m.id}>{m.team1_code} vs {m.team2_code} · {new Date(m.scheduled_at).toLocaleDateString()}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:2, marginBottom:6 }}>TEAM NAME</div>
                  <input placeholder="My Dream XI" value={teamName} onChange={e => setTeamName(e.target.value)} />
                </div>
              </div>
            </Card>

            {/* Tips */}
            <div style={{ background:'rgba(68,136,255,0.07)', border:'1px solid rgba(68,136,255,0.2)',
                          borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:'0.83rem', color:'#4488FF' }}>
              💡 Select 11 players · Budget: 100 Cr · Max 4 overseas · Tap <strong>C</strong> for Captain (2x) · <strong>VC</strong> for Vice Captain (1.5x)
            </div>

            {/* Filters */}
            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
              {ROLES.map(r => (
                <button key={r.key} onClick={() => setRoleFilter(r.key)} style={{
                  background: roleFilter===r.key ? 'rgba(255,107,0,0.15)' : 'var(--card)',
                  border:`1px solid ${roleFilter===r.key ? 'var(--orange)' : 'var(--border)'}`,
                  color: roleFilter===r.key ? 'var(--orange)' : 'var(--muted)',
                  padding:'5px 12px', borderRadius:7, cursor:'pointer',
                  fontFamily:'inherit', fontWeight:700, fontSize:'0.78rem', letterSpacing:1,
                }}>{r.label}</button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:16 }}>
              <input placeholder="🔍 Search player..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex:1 }} />
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} style={{ flex:'0 0 160px' }}>
                <option value="">All Teams</option>
                {iplTeamsList.map((t:any) => <option key={t.short_code} value={t.short_code}>{t.emoji} {t.short_code}</option>)}
              </select>
            </div>

            {loading ? <Spinner /> : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10 }}>
                {filtered.map(p => (
                  <PlayerCard key={p.id} player={p}
                    selected={selected.includes(p.id)}
                    isCaptain={captain === p.id}
                    isVC={vc === p.id}
                    onSelect={() => togglePlayer(p)}
                    onCaptain={() => selected.includes(p.id) && setCaptain(captain === p.id ? null : p.id)}
                    onVC={() => selected.includes(p.id) && setVc(vc === p.id ? null : p.id)}
                    showActions
                  />
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — selected team sidebar */}
          <div style={{ position:'sticky', top:100 }}>
            <Card>
              <div style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem', letterSpacing:2, marginBottom:16 }}>
                YOUR TEAM
              </div>

              {/* Credits bar */}
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:'0.8rem' }}>
                  <span style={{ color:'var(--muted)' }}>Budget Used</span>
                  <span style={{ fontFamily:'var(--font-mono)', color: remaining < 5 ? 'var(--red)' : 'var(--gold)', fontWeight:700 }}>
                    {totalCredits.toFixed(1)} / 100 Cr
                  </span>
                </div>
                <ProgressBar value={totalCredits} max={100} color={remaining < 10 ? 'red' : 'gold'} />
                <div style={{ marginTop:4, fontSize:'0.75rem', color:'var(--muted)', textAlign:'right' }}>
                  {remaining} Cr remaining
                </div>
              </div>

              {/* Role composition */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
                {[['🧤 WK', roleCounts.wk, 1], ['🏏 BAT', roleCounts.bat, 5], ['💫 AR', roleCounts.ar, 3], ['⚡ BOWL', roleCounts.bowl, 4]].map(([l, c, min]) => (
                  <div key={l as string} style={{ background:'var(--card2)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)' }}>{l as string}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: (c as number) < (min as number) ? 'var(--red)' : 'var(--green)', fontSize:'1.1rem' }}>
                      {c as number}
                    </div>
                  </div>
                ))}
              </div>

              {/* Player count */}
              <div style={{ textAlign:'center', marginBottom:16 }}>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem',
                               color: selected.length === 11 ? 'var(--green)' : 'var(--gold)' }}>
                  {selected.length}
                </span>
                <span style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', color:'var(--muted)' }}> / 11</span>
                {!captain && selected.length > 0 && (
                  <div style={{ color:'var(--orange)', fontSize:'0.78rem', marginTop:4 }}>⚠️ Set your Captain</div>
                )}
                {captain && !vc && (
                  <div style={{ color:'var(--orange)', fontSize:'0.78rem', marginTop:4 }}>⚠️ Set your Vice Captain</div>
                )}
              </div>

              {/* Selected players list */}
              {selectedPlayers.length > 0 ? (
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16, maxHeight:300, overflowY:'auto' }}>
                  {selectedPlayers.map(p => (
                    <PlayerCard key={p.id} player={p} compact
                      isCaptain={captain === p.id} isVC={vc === p.id}
                      selected
                      onSelect={() => togglePlayer(p)}
                      onCaptain={() => setCaptain(captain === p.id ? null : p.id)}
                      onVC={() => setVc(vc === p.id ? null : p.id)}
                      showActions
                    />
                  ))}
                </div>
              ) : (
                <div style={{ textAlign:'center', padding:'1.5rem 0', color:'var(--muted)', fontSize:'0.85rem', marginBottom:16 }}>
                  Select players from the left →
                </div>
              )}

              <Button onClick={handleSave} variant="gold" fullWidth size="lg"
                disabled={saving || selected.length !== 11 || !captain || !vc}>
                {saving ? '⏳ Saving...' : '💾 Save Team'}
              </Button>

              {selected.length !== 11 && (
                <p style={{ textAlign:'center', color:'var(--muted)', fontSize:'0.78rem', marginTop:8 }}>
                  {11 - selected.length} more player(s) needed
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <style>{`@media(max-width:900px){
        .container > div { grid-template-columns: 1fr !important; }
        .container > div > div:last-child { position: static !important; }
      }`}</style>
    </Layout>
  )
}
