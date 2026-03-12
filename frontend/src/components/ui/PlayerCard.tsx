// components/ui/PlayerCard.tsx
import { RoleBadge, Badge, Avatar } from './index'

export type Player = {
  id: number; full_name: string; short_name?: string
  role: string; credits: number; season_points: number
  emoji: string; team_name: string; short_code: string
  team_emoji: string; is_overseas: boolean; matches_played?: number
}

interface PlayerCardProps {
  player: Player
  selected?: boolean
  isCaptain?: boolean
  isVC?: boolean
  onSelect?: () => void
  onCaptain?: () => void
  onVC?: () => void
  showActions?: boolean
  compact?: boolean
  rank?: number
}

export default function PlayerCard({
  player: p, selected, isCaptain, isVC,
  onSelect, onCaptain, onVC, showActions, compact, rank
}: PlayerCardProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? 'rgba(255,107,0,0.07)' : 'var(--card)',
        border: `1px solid ${selected ? 'var(--orange)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: compact ? '10px 14px' : '14px 16px',
        cursor: onSelect ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'all 0.15s',
        position: 'relative',
      }}
      onMouseEnter={onSelect ? e => {
        const el = e.currentTarget as HTMLElement
        if (!selected) el.style.borderColor = 'rgba(255,215,0,0.25)'
      } : undefined}
      onMouseLeave={onSelect ? e => {
        const el = e.currentTarget as HTMLElement
        if (!selected) el.style.borderColor = 'var(--border)'
      } : undefined}
    >
      {/* Rank badge */}
      {rank !== undefined && (
        <div style={{
          position: 'absolute', top: -8, left: -8,
          background: rank <= 3 ? 'var(--gold)' : 'var(--card2)',
          color: rank <= 3 ? '#000' : 'var(--muted)',
          width: 24, height: 24, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700,
          border: '2px solid var(--card)',
        }}>{rank}</div>
      )}

      {/* Selected checkmark */}
      {selected && (
        <div style={{ position: 'absolute', top: 8, right: 10, color: 'var(--gold)', fontSize: '0.85rem', fontWeight: 700 }}>✓</div>
      )}

      <Avatar emoji={p.emoji} size={compact ? 36 : 44} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: compact ? '0.9rem' : '0.98rem',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.full_name}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: '2px 0' }}>
          {p.team_emoji} {p.short_code} · {p.credits} Cr
          {p.is_overseas && <span style={{ color: 'var(--gold)', marginLeft: 6 }}>🌍</span>}
        </div>
        {!compact && (
          <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
            <RoleBadge role={p.role} />
            {isCaptain && <Badge color="gold">C</Badge>}
            {isVC && <Badge color="orange">VC</Badge>}
          </div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontWeight: 700, fontSize: '1.05rem' }}>
          {p.season_points}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>pts</div>

        {showActions && selected && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6, justifyContent: 'flex-end' }}
               onClick={e => e.stopPropagation()}>
            <button onClick={onCaptain} style={{
              background: isCaptain ? 'var(--gold)' : 'rgba(255,215,0,0.1)',
              border: 'none', borderRadius: 4, padding: '2px 8px',
              color: isCaptain ? '#000' : 'var(--gold)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: '0.72rem',
            }}>C</button>
            <button onClick={onVC} style={{
              background: isVC ? 'var(--orange)' : 'rgba(255,107,0,0.1)',
              border: 'none', borderRadius: 4, padding: '2px 8px',
              color: isVC ? '#fff' : 'var(--orange)', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: '0.72rem',
            }}>VC</button>
          </div>
        )}
      </div>
    </div>
  )
}
