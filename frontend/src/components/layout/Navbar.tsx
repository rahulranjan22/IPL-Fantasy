'use client'
// components/layout/Navbar.tsx
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useAuthStore } from '../../lib/store'
import { useState } from 'react'
import { Button, Avatar } from '../ui'

const NAV_LINKS = [
  { href: '/',              label: 'Home',        icon: '🏠' },
  { href: '/matches',       label: 'Matches',     icon: '📅' },
  { href: '/players',       label: 'Players',     icon: '👥' },
  { href: '/teams/build',   label: 'My Team',     icon: '🏏' },
  { href: '/leaderboard',   label: 'Rankings',    icon: '🏆' },
  { href: '/my-teams',      label: 'My Teams',    icon: '📋' },
]

export default function Navbar({ onAuthClick }: { onAuthClick: () => void }) {
  const router   = useRouter()
  const { user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(8,8,14,0.96)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Main bar */}
        <div className="container" style={{ display: 'flex', alignItems: 'center', height: 62, gap: 16 }}>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              letterSpacing: 2,
              background: 'linear-gradient(135deg, var(--orange), var(--gold))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>🏏 CRICKET<span style={{ WebkitTextFillColor: '#E8E8F0', color: '#E8E8F0' }}>DREAM</span></div>
          </Link>

          {/* Desktop nav */}
          <div className="hide-mobile" style={{ display: 'flex', gap: 2, flex: 1, justifyContent: 'center' }}>
            {NAV_LINKS.map(({ href, label }) => {
              const active = router.pathname === href || router.pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: active ? 'var(--gold)' : 'var(--muted)',
                    background: active ? 'rgba(255,107,0,0.12)' : 'transparent',
                    transition: 'all 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                  >{label}</div>
                </Link>
              )
            })}
            {user?.is_admin && (
              <Link href="/admin" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.85rem',
                  fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
                  color: router.pathname.startsWith('/admin') ? 'var(--gold)' : 'var(--muted)',
                  background: router.pathname.startsWith('/admin') ? 'rgba(255,107,0,0.12)' : 'transparent',
                }}>⚙ Admin</div>
              </Link>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg,var(--orange),var(--gold))',
              color: '#000', padding: '3px 10px', borderRadius: 20,
              fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1,
            }}>IPL 2025</div>

            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <Link href="/profile" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Avatar emoji={user.avatar_emoji || '🏏'} size={34} />
                  <span className="hide-mobile" style={{ fontSize: '0.9rem', color: 'var(--gold)', fontWeight: 600 }}>
                    {user.display_name || user.username}
                  </span>
                </Link>
                <button onClick={logout} style={{
                  background: 'rgba(255,68,85,0.12)', border: '1px solid rgba(255,68,85,0.25)',
                  color: 'var(--red)', padding: '5px 12px', borderRadius: 7,
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700,
                }}>Out</button>
              </div>
            ) : (
              <Button onClick={onAuthClick} variant="primary" size="sm">Login / Join</Button>
            )}

            {/* Mobile menu toggle */}
            <button className="hide-desktop" onClick={() => setMobileOpen(v => !v)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                       padding: '6px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: '1.1rem' }}>
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Live ticker */}
        <div style={{
          background: 'rgba(255,107,0,0.07)',
          borderTop: '1px solid rgba(255,107,0,0.12)',
          padding: '6px 0',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ display: 'inline-block', animation: 'ticker 35s linear infinite',
                         fontSize: '0.8rem', color: 'var(--orange)', fontWeight: 600 }}>
            🏏 LIVE: MI vs CSK — Rohit Sharma 67*(45) &nbsp;|&nbsp; Bumrah 2/18 (4) &nbsp;|&nbsp;
            🔥 Virat Kohli: Fantasy top-pick this week &nbsp;|&nbsp;
            ⚡ Fastest 50: SKY in 17 balls &nbsp;|&nbsp;
            🏆 IPL Fantasy Season 2025 — Play now and win! &nbsp;|&nbsp;
            📊 Rashid Khan: 340 pts this season &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          </span>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div style={{
          position: 'fixed', top: 62, left: 0, right: 0, bottom: 0,
          background: 'rgba(8,8,14,0.98)', zIndex: 99,
          padding: '2rem 1.5rem',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {NAV_LINKS.map(({ href, label, icon }) => (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}
              onClick={() => setMobileOpen(false)}>
              <div style={{
                padding: '14px 18px', borderRadius: 10,
                background: router.pathname === href ? 'rgba(255,107,0,0.12)' : 'var(--card)',
                border: `1px solid ${router.pathname === href ? 'rgba(255,107,0,0.3)' : 'var(--border)'}`,
                color: router.pathname === href ? 'var(--gold)' : 'var(--text)',
                fontSize: '1rem', fontWeight: 600, display: 'flex', gap: 12, alignItems: 'center',
              }}>{icon} {label}</div>
            </Link>
          ))}
        </div>
      )}

      <style>{`.hide-desktop { display: none } @media(max-width:768px){ .hide-desktop{ display:flex } }`}</style>
    </>
  )
}
