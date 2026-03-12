// components/ui/MatchCard.tsx
import Link from 'next/link'
import { MatchStatus } from './index'
import { format } from 'date-fns'

export type Match = {
  id: number; match_number?: number
  team1_name: string; team2_name: string
  team1_emoji: string; team2_emoji: string
  team1_code: string; team2_code: string
  team1_score?: string; team2_score?: string
  scheduled_at: string; status: string
  venue?: string; city?: string
  winner_name?: string; motm_name?: string
}

export default function MatchCard({ match: m, compact }: { match: Match; compact?: boolean }) {
  const dateStr = (() => {
    try { return format(new Date(m.scheduled_at), 'd MMM, h:mm a') } catch { return m.scheduled_at }
  })()

  return (
    <Link href={`/matches/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: 'var(--card)',
        border: `1px solid ${m.status === 'live' ? 'rgba(0,230,118,0.25)' : 'var(--border)'}`,
        borderRadius: 14,
        padding: compact ? '14px 16px' : '20px 24px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = m.status === 'live' ? 'rgba(0,230,118,0.4)' : 'var(--border-hover)'
        el.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = m.status === 'live' ? 'rgba(0,230,118,0.25)' : 'var(--border)'
        el.style.transform = ''
      }}
      >
        {/* Live glow bar */}
        {m.status === 'live' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg,var(--green),transparent)',
          }} />
        )}

        {/* Match number */}
        {m.match_number && (
          <div style={{ position: 'absolute', top: 12, right: 14, fontSize: '0.68rem',
                        color: 'var(--muted)', letterSpacing: 1 }}>
            MATCH #{m.match_number}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 16 }}>
          {/* Team 1 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: compact ? '1.8rem' : '2.5rem' }}>{m.team1_emoji}</div>
            <div style={{ fontWeight: 700, fontSize: compact ? '0.9rem' : '1rem', marginTop: 4 }}>
              {compact ? m.team1_code : m.team1_name}
            </div>
            {m.team1_score && (
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: '0.9rem', marginTop: 4 }}>
                {m.team1_score}
              </div>
            )}
          </div>

          {/* Centre info */}
          <div style={{ textAlign: 'center', minWidth: 110 }}>
            <MatchStatus status={m.status} />
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--muted)', margin: '4px 0' }}>VS</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
              {dateStr}<br/>
              {!compact && (m.city || m.venue)}
            </div>
            {m.winner_name && (
              <div style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700, marginTop: 6 }}>
                🏆 {m.winner_name}
              </div>
            )}
          </div>

          {/* Team 2 */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: compact ? '1.8rem' : '2.5rem' }}>{m.team2_emoji}</div>
            <div style={{ fontWeight: 700, fontSize: compact ? '0.9rem' : '1rem', marginTop: 4 }}>
              {compact ? m.team2_code : m.team2_name}
            </div>
            {m.team2_score && (
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: '0.9rem', marginTop: 4 }}>
                {m.team2_score}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
