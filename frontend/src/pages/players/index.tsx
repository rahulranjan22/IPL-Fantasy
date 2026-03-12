'use client'
// pages/players/index.tsx — Player Database
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { SectionTitle, Spinner, EmptyState, StatBox } from '../../components/ui'
import PlayerCard, { Player } from '../../components/ui/PlayerCard'
import { players as playersApi, iplTeams } from '../../lib/api'

const ROLES = [
  { key: '', label: 'All Roles' },
  { key: 'bat', label: '🏏 Batters' },
  { key: 'bowl', label: '⚡ Bowlers' },
  { key: 'ar', label: '💫 All-Rounders' },
  { key: 'wk', label: '🧤 Keepers' },
]
const SORTS = [
  { key: 'season_points', label: 'Top Points' },
  { key: 'credits', label: 'Highest Credits' },
  { key: 'name', label: 'Name A-Z' },
]

export default function PlayersPage() {
  const [all, setAll]         = useState<Player[]>([])
  const [teams, setTeams]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole]       = useState('')
  const [team, setTeam]       = useState('')
  const [sort, setSort]       = useState('season_points')
  const [search, setSearch]   = useState('')

  useEffect(() => {
    Promise.all([
      playersApi.list({ sort }),
      iplTeams(),
    ]).then(([p, t]) => { setAll(p); setTeams(t); setLoading(false) })
    .catch(() => setLoading(false))
  }, [sort])

  const filtered = all.filter(p =>
    (!role || p.role === role) &&
    (!team || p.short_code === team) &&
    (!search || p.full_name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <Layout>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <SectionTitle accent="👥">PLAYER DATABASE</SectionTitle>

        {/* Stats summary */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
          <StatBox label="Total Players" value={all.length} />
          <StatBox label="Batters"       value={all.filter(p=>p.role==='bat').length} />
          <StatBox label="Bowlers"       value={all.filter(p=>p.role==='bowl').length} />
          <StatBox label="All-Rounders"  value={all.filter(p=>p.role==='ar').length} />
          <StatBox label="Keepers"       value={all.filter(p=>p.role==='wk').length} />
        </div>

        {/* Filters */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:20 }}>
          <input placeholder="🔍 Search by name..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex:'1 1 200px', maxWidth:300 }} />

          <select value={role} onChange={e => setRole(e.target.value)} style={{ flex:'0 0 160px' }}>
            {ROLES.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>

          <select value={team} onChange={e => setTeam(e.target.value)} style={{ flex:'0 0 180px' }}>
            <option value="">All Teams</option>
            {teams.map((t: any) => <option key={t.short_code} value={t.short_code}>{t.emoji} {t.name}</option>)}
          </select>

          <select value={sort} onChange={e => setSort(e.target.value)} style={{ flex:'0 0 160px' }}>
            {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {/* Results count */}
        <div style={{ color:'var(--muted)', fontSize:'0.85rem', marginBottom:16 }}>
          Showing <strong style={{ color:'var(--text)' }}>{filtered.length}</strong> players
        </div>

        {/* Grid */}
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState emoji="👥" title="No Players Found" desc="Try a different search or filter" />
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
            {filtered.map((p, i) => (
              <PlayerCard key={p.id} player={p} rank={sort === 'season_points' ? i + 1 : undefined} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
