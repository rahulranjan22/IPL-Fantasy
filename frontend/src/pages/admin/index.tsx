'use client'
// pages/admin/index.tsx — Admin Panel
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, Button, Spinner, Badge, EmptyState } from '../../components/ui'
import { players as playersApi, matches as matchesApi, scores as scoresApi, iplTeams } from '../../lib/api'
import { useAuthStore } from '../../lib/store'
import toast from 'react-hot-toast'
import { useRouter } from 'next/router'

type AdminTab = 'scores' | 'results' | 'players' | 'matches'

export default function AdminPage() {
  const { user }   = useAuthStore()
  const router     = useRouter()
  const [tab, setTab] = useState<AdminTab>('scores')

  const [allMatches, setAllMatches]   = useState<any[]>([])
  const [allPlayers, setAllPlayers]   = useState<any[]>([])
  const [iplTeamsList, setIplTeams]   = useState<any[]>([])
  const [loading, setLoading]         = useState(true)

  // Score form
  const [sf, setSf] = useState<any>({ runs_scored:0, wickets:0, catches:0, stumpings:0,
    fours:0, sixes:0, overs_bowled:0, maidens:0, run_outs_direct:0, is_motm:false, is_playing_xi:true })
  const [sfMatch, setSfMatch]   = useState<number|null>(null)
  const [sfPlayer, setSfPlayer] = useState<number|null>(null)
  const [preview, setPreview]   = useState<any>(null)

  // Result form
  const [rf, setRf] = useState({ match_id:0, team1_score:'', team2_score:'', winner:'' })

  // New player form
  const [np, setNp] = useState({ full_name:'', team_code:'', role:'bat', credits:8.0, nationality:'India', is_overseas:false, emoji:'🏏' })

  // New match form
  const [nm, setNm] = useState({ team1:'', team2:'', venue:'', city:'', scheduled_at:'', match_number:'' })

  useEffect(() => {
    if (!user) return
    if (!user.is_admin) { router.push('/'); return }
    Promise.all([matchesApi.list(), playersApi.list(), iplTeams()])
      .then(([m, p, t]) => { setAllMatches(m); setAllPlayers(p); setIplTeams(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const previewPts = async () => {
    try {
      const res = await scoresApi.preview({ ...sf, match_id: sfMatch, player_id: sfPlayer })
      setPreview(res)
    } catch (e: any) { toast.error(e.message) }
  }

  const submitScore = async () => {
    if (!sfMatch || !sfPlayer) { toast.error('Select match and player'); return }
    try {
      const res = await scoresApi.add({ ...sf, match_id: sfMatch, player_id: sfPlayer })
      toast.success(`✅ ${res.fantasy_points} pts saved!`)
      setPreview(null)
    } catch (e: any) { toast.error(e.message) }
  }

  const calculateMatch = async (mid: number) => {
    try {
      const res = await scoresApi.calculate(mid)
      toast.success(`✅ Points calculated for ${res.teams_updated} teams!`)
    } catch (e: any) { toast.error(e.message) }
  }

  const submitResult = async () => {
    if (!rf.match_id) { toast.error('Select a match'); return }
    try {
      await matchesApi.update(rf.match_id, { team1_score:rf.team1_score, team2_score:rf.team2_score, winner:rf.winner, status:'completed' })
      toast.success('Match result saved!')
      const updated = await matchesApi.list()
      setAllMatches(updated)
    } catch (e: any) { toast.error(e.message) }
  }

  const submitPlayer = async () => {
    if (!np.full_name) { toast.error('Enter player name'); return }
    try {
      await playersApi.add(np)
      toast.success(`${np.full_name} added!`)
      const updated = await playersApi.list()
      setAllPlayers(updated)
      setNp({ full_name:'', team_code:'', role:'bat', credits:8.0, nationality:'India', is_overseas:false, emoji:'🏏' })
    } catch (e: any) { toast.error(e.message) }
  }

  if (!user) return <Layout><div style={{padding:'3rem',textAlign:'center',color:'var(--muted)'}}>Loading...</div></Layout>
  if (!user.is_admin) return null

  const TABS: { key: AdminTab; label: string }[] = [
    { key:'scores',  label:'📊 Add Scores' },
    { key:'results', label:'🏆 Match Results' },
    { key:'players', label:'👤 Add Player' },
    { key:'matches', label:'📅 Add Match' },
  ]

  const numField = (label: string, key: string) => (
    <div>
      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{label}</div>
      <input type="number" min={0} value={sf[key]} style={{ padding:'8px 10px' }}
        onChange={e => setSf((p:any) => ({...p, [key]: Number(e.target.value)}))} />
    </div>
  )

  return (
    <Layout>
      <div className="container" style={{ padding:'2rem 1.5rem' }}>
        <SectionTitle accent="⚙️">ADMIN PANEL</SectionTitle>

        {/* Tab bar */}
        <div style={{ display:'flex', gap:8, marginBottom:24, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background: tab===t.key ? 'rgba(255,107,0,0.15)' : 'var(--card)',
              border:`1px solid ${tab===t.key ? 'var(--orange)' : 'var(--border)'}`,
              color: tab===t.key ? 'var(--orange)' : 'var(--muted)',
              padding:'8px 18px', borderRadius:8, cursor:'pointer',
              fontFamily:'inherit', fontWeight:700, fontSize:'0.85rem', letterSpacing:1,
            }}>{t.label}</button>
          ))}
        </div>

        {loading ? <Spinner /> : (

          <>
            {/* SCORES TAB */}
            {tab === 'scores' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, alignItems:'start' }}>
                <Card>
                  <h3 style={{ color:'var(--gold)', marginBottom:16, fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
                    ENTER PLAYER PERFORMANCE
                  </h3>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>MATCH</div>
                    <select value={sfMatch||''} onChange={e => setSfMatch(Number(e.target.value))}>
                      <option value="">Select match...</option>
                      {allMatches.map(m => <option key={m.id} value={m.id}>{m.team1_code} vs {m.team2_code}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>PLAYER</div>
                    <select value={sfPlayer||''} onChange={e => setSfPlayer(Number(e.target.value))}>
                      <option value="">Select player...</option>
                      {allPlayers.map(p => <option key={p.id} value={p.id}>{p.full_name} ({p.short_code})</option>)}
                    </select>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                    {numField('RUNS','runs_scored')}
                    {numField('BALLS FACED','balls_faced')}
                    {numField('FOURS (4s)','fours')}
                    {numField('SIXES (6s)','sixes')}
                    {numField('WICKETS','wickets')}
                    {numField('OVERS BOWLED','overs_bowled')}
                    {numField('RUNS CONCEDED','runs_conceded')}
                    {numField('MAIDENS','maidens')}
                    {numField('CATCHES','catches')}
                    {numField('STUMPINGS','stumpings')}
                  </div>
                  <div style={{ display:'flex', gap:16, marginBottom:16 }}>
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.85rem' }}>
                      <input type="checkbox" checked={sf.is_motm}
                        onChange={e => setSf((p:any) => ({...p, is_motm:e.target.checked}))} />
                      Man of the Match ⭐
                    </label>
                    <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:'0.85rem' }}>
                      <input type="checkbox" checked={sf.is_playing_xi}
                        onChange={e => setSf((p:any) => ({...p, is_playing_xi:e.target.checked}))} />
                      Playing XI
                    </label>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <Button onClick={previewPts} variant="ghost">Preview Points</Button>
                    <Button onClick={submitScore} variant="primary">Save Performance</Button>
                  </div>
                </Card>

                {/* Points preview */}
                <Card>
                  <h3 style={{ color:'var(--gold)', marginBottom:16, fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
                    POINTS BREAKDOWN
                  </h3>
                  {preview ? (
                    <>
                      {Object.entries(preview.breakdown || {}).filter(([k]) => k !== 'total').map(([k, v]) => (
                        Number(v) !== 0 && (
                          <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0',
                                                borderBottom:'1px solid rgba(255,215,0,0.05)', fontSize:'0.9rem' }}>
                            <span style={{ color:'var(--muted)', textTransform:'capitalize' }}>{k.replace(/_/g,' ')}</span>
                            <span style={{ fontFamily:'var(--font-mono)', fontWeight:700,
                                           color: Number(v) < 0 ? 'var(--red)' : 'var(--gold)' }}>
                              {Number(v) > 0 ? '+' : ''}{v as any}
                            </span>
                          </div>
                        )
                      ))}
                      <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0',
                                    borderTop:'2px solid var(--border)', marginTop:8 }}>
                        <span style={{ fontWeight:700 }}>TOTAL FANTASY POINTS</span>
                        <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'1.4rem', color:'var(--green)' }}>
                          {preview.fantasy_points}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div style={{ color:'var(--muted)', textAlign:'center', padding:'3rem 0', fontSize:'0.9rem' }}>
                      Fill in performance and click<br/>"Preview Points" to see breakdown
                    </div>
                  )}

                  {/* Calculate match */}
                  <div style={{ borderTop:'1px solid var(--border)', marginTop:20, paddingTop:16 }}>
                    <div style={{ fontSize:'0.72rem', color:'var(--muted)', letterSpacing:2, marginBottom:10 }}>
                      FINALIZE MATCH (after all players entered)
                    </div>
                    <select style={{ marginBottom:10 }} id="calc-match">
                      <option value="">Select match to finalize</option>
                      {allMatches.map(m => <option key={m.id} value={m.id}>{m.team1_code} vs {m.team2_code}</option>)}
                    </select>
                    <Button onClick={() => {
                      const mid = Number((document.getElementById('calc-match') as HTMLSelectElement)?.value)
                      if (mid) calculateMatch(mid)
                      else toast.error('Select a match')
                    }} variant="gold" fullWidth>
                      🏆 Calculate All Fantasy Points
                    </Button>
                  </div>
                </Card>
              </div>
            )}

            {/* RESULTS TAB */}
            {tab === 'results' && (
              <div style={{ maxWidth:600 }}>
                <Card>
                  <h3 style={{ color:'var(--gold)', marginBottom:20, fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
                    UPDATE MATCH RESULT
                  </h3>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>MATCH</div>
                    <select value={rf.match_id} onChange={e => setRf(p => ({...p, match_id: Number(e.target.value)}))}>
                      <option value="">Select match...</option>
                      {allMatches.filter(m => m.status !== 'completed').map(m => (
                        <option key={m.id} value={m.id}>{m.team1_code} vs {m.team2_code}</option>
                      ))}
                    </select>
                  </div>
                  {[['TEAM 1 SCORE','team1_score','e.g. 192/5 (20)'],['TEAM 2 SCORE','team2_score','e.g. 178/8 (20)']].map(([l,k,ph]) => (
                    <div key={k} style={{ marginBottom:12 }}>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{l}</div>
                      <input placeholder={ph} value={(rf as any)[k]} onChange={e => setRf(p => ({...p, [k]: e.target.value}))} />
                    </div>
                  ))}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>WINNER</div>
                    <select value={rf.winner} onChange={e => setRf(p => ({...p, winner: e.target.value}))}>
                      <option value="">Select winner...</option>
                      {iplTeamsList.map((t: any) => <option key={t.short_code} value={t.short_code}>{t.emoji} {t.name}</option>)}
                    </select>
                  </div>
                  <Button onClick={submitResult} variant="primary" fullWidth>✅ Save Result</Button>
                </Card>
              </div>
            )}

            {/* ADD PLAYER TAB */}
            {tab === 'players' && (
              <div style={{ maxWidth:600 }}>
                <Card>
                  <h3 style={{ color:'var(--gold)', marginBottom:20, fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
                    ADD NEW PLAYER
                  </h3>
                  {[['FULL NAME','full_name','e.g. Virat Kohli'],['NATIONALITY','nationality','e.g. India']].map(([l,k,ph]) => (
                    <div key={k} style={{ marginBottom:12 }}>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{l}</div>
                      <input placeholder={ph} value={(np as any)[k]} onChange={e => setNp(p => ({...p, [k]: e.target.value}))} />
                    </div>
                  ))}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>TEAM</div>
                      <select value={np.team_code} onChange={e => setNp(p => ({...p, team_code: e.target.value}))}>
                        <option value="">Select team</option>
                        {iplTeamsList.map((t:any) => <option key={t.short_code} value={t.short_code}>{t.emoji} {t.short_code}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>ROLE</div>
                      <select value={np.role} onChange={e => setNp(p => ({...p, role: e.target.value}))}>
                        <option value="bat">🏏 Batter</option>
                        <option value="bowl">⚡ Bowler</option>
                        <option value="ar">💫 All-Rounder</option>
                        <option value="wk">🧤 Keeper</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>CREDITS</div>
                      <input type="number" min={1} max={11} step={0.5} value={np.credits}
                        onChange={e => setNp(p => ({...p, credits: Number(e.target.value)}))} />
                    </div>
                    <div>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>EMOJI</div>
                      <input value={np.emoji} onChange={e => setNp(p => ({...p, emoji: e.target.value}))} />
                    </div>
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', marginBottom:20, fontSize:'0.85rem' }}>
                    <input type="checkbox" checked={np.is_overseas}
                      onChange={e => setNp(p => ({...p, is_overseas: e.target.checked}))} />
                    Overseas player 🌍
                  </label>
                  <Button onClick={submitPlayer} variant="gold" fullWidth>➕ Add Player</Button>
                </Card>
              </div>
            )}

            {/* ADD MATCH TAB */}
            {tab === 'matches' && (
              <div style={{ maxWidth:600 }}>
                <Card>
                  <h3 style={{ color:'var(--gold)', marginBottom:20, fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>
                    ADD NEW MATCH
                  </h3>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                    {['team1','team2'].map(k => (
                      <div key={k}>
                        <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{k.toUpperCase()}</div>
                        <select value={(nm as any)[k]} onChange={e => setNm(p => ({...p, [k]: e.target.value}))}>
                          <option value="">Select team</option>
                          {iplTeamsList.map((t:any) => <option key={t.short_code} value={t.short_code}>{t.emoji} {t.short_code}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                  {[['VENUE','venue','e.g. Wankhede Stadium'],['CITY','city','e.g. Mumbai'],['MATCH NUMBER','match_number','e.g. 1']].map(([l,k,ph]) => (
                    <div key={k} style={{ marginBottom:12 }}>
                      <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>{l}</div>
                      <input placeholder={ph} value={(nm as any)[k]} onChange={e => setNm(p => ({...p, [k]: e.target.value}))} />
                    </div>
                  ))}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', letterSpacing:2, marginBottom:4 }}>MATCH DATE & TIME</div>
                    <input type="datetime-local" value={nm.scheduled_at} onChange={e => setNm(p => ({...p, scheduled_at: e.target.value}))} />
                  </div>
                  <Button onClick={async () => {
                    try {
                      await matchesApi.create({ ...nm, match_number: nm.match_number ? Number(nm.match_number) : undefined })
                      toast.success('Match added!')
                      const updated = await matchesApi.list()
                      setAllMatches(updated)
                      setNm({ team1:'', team2:'', venue:'', city:'', scheduled_at:'', match_number:'' })
                    } catch (e: any) { toast.error(e.message) }
                  }} variant="gold" fullWidth>📅 Add Match</Button>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
