'use client'
// pages/matches/index.tsx — All Matches
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { SectionTitle, Spinner, EmptyState } from '../../components/ui'
import MatchCard, { Match } from '../../components/ui/MatchCard'
import { matches as matchesApi } from '../../lib/api'

const TABS = ['all', 'live', 'upcoming', 'completed'] as const
type Tab = typeof TABS[number]

export default function MatchesPage() {
  const [all, setAll]     = useState<Match[]>([])
  const [tab, setTab]     = useState<Tab>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    matchesApi.list().then(d => { setAll(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const filtered = tab === 'all' ? all : all.filter(m => m.status === tab)

  return (
    <Layout>
      <div className="container" style={{ padding: '2rem 1.5rem' }}>
        <SectionTitle accent="📅">IPL FIXTURES</SectionTitle>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? 'rgba(255,107,0,0.15)' : 'var(--card)',
              border: `1px solid ${tab === t ? 'var(--orange)' : 'var(--border)'}`,
              color: tab === t ? 'var(--orange)' : 'var(--muted)',
              padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: '0.82rem',
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {t === 'live' && '🔴 '}{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              <span style={{ marginLeft: 6, background: 'rgba(255,255,255,0.08)',
                             padding: '1px 6px', borderRadius: 10, fontSize: '0.7rem' }}>
                {(t === 'all' ? all : all.filter(m => m.status === t)).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState emoji="📅" title="No Matches Found" desc="Check back soon for upcoming fixtures" />
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filtered.map(m => <MatchCard key={m.id} match={m} />)}
          </div>
        )}
      </div>
    </Layout>
  )
}
