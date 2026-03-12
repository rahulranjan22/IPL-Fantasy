'use client'
// pages/index.tsx — Homepage
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Layout from '../components/layout/Layout'
import { Card, StatBox, SectionTitle, Spinner, Button } from '../components/ui'
import PlayerCard, { Player } from '../components/ui/PlayerCard'
import MatchCard, { Match } from '../components/ui/MatchCard'
import { players as playersApi, matches as matchesApi } from '../lib/api'
import { useAuthStore } from '../lib/store'

export default function HomePage() {
  const { user } = useAuthStore()
  const [topPlayers, setTopPlayers] = useState<Player[]>([])
  const [liveMatches, setLiveMatches] = useState<Match[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      playersApi.top(6),
      matchesApi.list('live'),
      matchesApi.list('upcoming'),
    ]).then(([top, live, upcoming]) => {
      setTopPlayers(top)
      setLiveMatches(live)
      setUpcomingMatches(upcoming.slice(0, 4))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <Layout>
      {/* ── HERO ────────────────────────────────────────── */}
      <section style={{ padding: '5rem 0 3rem', textAlign: 'center', position: 'relative' }}>
        <div className="container">
          <div style={{
            display: 'inline-block',
            border: '1px solid var(--orange)', color: 'var(--orange)',
            fontSize: '0.72rem', letterSpacing: 3, padding: '5px 16px',
            borderRadius: 3, marginBottom: '1.5rem',
          }}>🏆 IPL 2025 SEASON — PLAY NOW</div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 10vw, 7rem)',
            lineHeight: 0.9, letterSpacing: 4, marginBottom: '1.2rem',
          }}>
            <span style={{ display: 'block', color: 'var(--orange)' }}>CRICKET</span>
            <span style={{ display: 'block', color: 'var(--gold)' }}>DREAM</span>
            <span style={{ display: 'block' }}>FANTASY</span>
          </h1>

          <p style={{ color: 'var(--muted)', fontSize: '1.1rem', maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Pick your Dream XI, captain wisely, outscore thousands of rivals and win big every match day.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/teams/build" style={{ textDecoration: 'none' }}>
              <Button variant="gold" size="lg">🏏 Build My Team</Button>
            </Link>
            <Link href="/leaderboard" style={{ textDecoration: 'none' }}>
              <Button variant="ghost" size="lg">🏆 View Rankings</Button>
            </Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            {[['10', 'IPL Teams'], ['200+', 'Players'], ['₹10L', 'Prize Pool'], ['4,200+', 'Users']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--gold)' }}>{n}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingBottom: '3rem' }}>

        {/* ── LIVE MATCHES ── */}
        {liveMatches.length > 0 && (
          <section style={{ marginBottom: '3rem' }}>
            <SectionTitle accent="🔴">LIVE NOW</SectionTitle>
            <div style={{ display: 'grid', gap: 16 }}>
              {liveMatches.map(m => <MatchCard key={m.id} match={m} />)}
            </div>
          </section>
        )}

        {/* ── HOW TO PLAY ── */}
        <section style={{ marginBottom: '3rem' }}>
          <SectionTitle>HOW TO PLAY</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up free in seconds and get 100 fantasy credits', icon: '👤' },
              { step: '02', title: 'Pick Your XI', desc: 'Select 11 players within your 100 Cr budget', icon: '🏏' },
              { step: '03', title: 'Set C & VC', desc: 'Captain gets 2x points, Vice Captain gets 1.5x', icon: '👑' },
              { step: '04', title: 'Win Prizes', desc: 'Top scorers win from the prize pool each match', icon: '🏆' },
            ].map(({ step, title, desc, icon }) => (
              <Card key={step} style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', color: 'var(--orange)', opacity: 0.4 }}>{step}</div>
                <div style={{ fontSize: '2rem', margin: '-8px 0 8px' }}>{icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{desc}</div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── UPCOMING MATCHES ── */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <SectionTitle>UPCOMING MATCHES</SectionTitle>
            <Link href="/matches" style={{ textDecoration: 'none', color: 'var(--orange)', fontSize: '0.85rem', fontWeight: 700 }}>
              View all →
            </Link>
          </div>
          {loading ? <Spinner /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
              {upcomingMatches.map(m => <MatchCard key={m.id} match={m} />)}
              {upcomingMatches.length === 0 && (
                <p style={{ color: 'var(--muted)', gridColumn: '1/-1' }}>No upcoming matches scheduled yet.</p>
              )}
            </div>
          )}
        </section>

        {/* ── TOP PERFORMERS ── */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <SectionTitle accent="⚡">TOP PERFORMERS</SectionTitle>
            <Link href="/players" style={{ textDecoration: 'none', color: 'var(--orange)', fontSize: '0.85rem', fontWeight: 700 }}>
              All players →
            </Link>
          </div>
          {loading ? <Spinner /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {topPlayers.map((p, i) => (
                <PlayerCard key={p.id} player={p} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        {/* ── SCORING OVERVIEW ── */}
        <section style={{ marginBottom: '3rem' }}>
          <SectionTitle>SCORING RULES</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {[
              { title: '🏏 Batting', rules: [['Per run', '+1'], ['Boundary (4)', '+1'], ['Six', '+2'], ['Half century', '+8'], ['Century', '+16'], ['Duck', '-2']] },
              { title: '⚡ Bowling', rules: [['Per wicket', '+25'], ['3-wkt haul', '+4'], ['5-wkt haul', '+8'], ['Maiden over', '+8'], ['Economy <5', '+6'], ['Economy >12', '-6']] },
              { title: '🧤 Fielding', rules: [['Catch', '+8'], ['Stumping', '+12'], ['Direct run-out', '+12'], ['Indirect run-out', '+6'], ['3+ catches', '+4'], ['Playing XI', '+4']] },
              { title: '👑 Bonus', rules: [['Captain', '2x'], ['Vice Captain', '1.5x'], ['Man of Match', '+15'], ['50+ SR bonus', '+6'], ['Economy <7', '+4'], [''] ] },
            ].map(({ title, rules }) => (
              <Card key={title}>
                <div style={{ fontWeight: 700, color: 'var(--gold)', marginBottom: 12 }}>{title}</div>
                {rules.map(([k, v], i) => k && (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                                        padding: '6px 0', borderBottom: i < rules.length - 1 ? '1px solid rgba(255,215,0,0.05)' : 'none',
                                        fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--muted)' }}>{k}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700,
                                   color: typeof v === 'string' && v.startsWith('-') ? 'var(--red)' : 'var(--gold)' }}>{v}</span>
                  </div>
                ))}
              </Card>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        {!user && (
          <section style={{ textAlign: 'center', padding: '3rem', background: 'var(--card)',
                            border: '1px solid var(--border)', borderRadius: 20 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: 12 }}>
              READY TO PLAY?
            </h2>
            <p style={{ color: 'var(--muted)', marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem' }}>
              Join thousands of fans. Build your Dream XI and compete for prizes every match day.
            </p>
            <Link href="/teams/build" style={{ textDecoration: 'none' }}>
              <Button variant="gold" size="lg">Join Free — Start Playing 🏏</Button>
            </Link>
          </section>
        )}
      </div>
    </Layout>
  )
}
