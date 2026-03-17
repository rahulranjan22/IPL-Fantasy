'use client'
// pages/profile/index.tsx — User profile + stats
import { useEffect, useState } from 'react'
import Layout from '../../components/layout/Layout'
import { Card, SectionTitle, StatBox, Button, Avatar, EmptyState } from '../../components/ui'
import { leaderboard as lbApi } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../lib/store'
import toast from 'react-hot-toast'
import Link from 'next/link'

const AVATARS = ['🏏','🏆','⚡','🔥','💪','🌟','🎯','👑','🦁','🚀','🎪','🌪️','💎','🦅','🔱']

export default function ProfilePage() {
  const { user, fetchMe, logout } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ display_name: '', avatar_emoji: '' })
  const [myRank, setMyRank] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ display_name: user.display_name || '', avatar_emoji: user.avatar_emoji || '🏏' })
      lbApi.season(200).then(lb => {
        const r = lb.find((x: any) => x.username === user.username)
        if (r) setMyRank(r)
      }).catch(() => {})
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: form.display_name, avatar_emoji: form.avatar_emoji, updated_at: new Date().toISOString() })
        .eq('id', user!.id)
      if (error) throw new Error(error.message)
      await fetchMe()
      toast.success('Profile updated!')
      setEditing(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!user) return (
    <Layout>
      <div className="container" style={{ padding:'3rem' }}>
        <EmptyState emoji="🔒" title="Not Logged In" desc="Please login to view your profile"
          action={<Link href="/" style={{ textDecoration:'none' }}><Button variant="gold">Go Home</Button></Link>} />
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="container" style={{ padding:'2rem 1.5rem', maxWidth:800 }}>
        <SectionTitle accent="👤">MY PROFILE</SectionTitle>

        {/* Profile card */}
        <Card style={{ marginBottom:24 }}>
          <div style={{ display:'flex', gap:20, alignItems:'flex-start', flexWrap:'wrap' }}>
            <div style={{ position:'relative' }}>
              <Avatar emoji={form.avatar_emoji || user.avatar_emoji || '🏏'} size={72} />
            </div>
            <div style={{ flex:1 }}>
              {editing ? (
                <>
                  <div style={{ marginBottom:12 }}>
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:2, marginBottom:6 }}>DISPLAY NAME</div>
                    <input value={form.display_name} onChange={e => setForm(p => ({...p, display_name: e.target.value}))}
                      style={{ maxWidth:300 }} />
                  </div>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:'0.7rem', color:'var(--muted)', letterSpacing:2, marginBottom:8 }}>AVATAR</div>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {AVATARS.map(e => (
                        <button key={e} onClick={() => setForm(p => ({...p, avatar_emoji: e}))} style={{
                          width:36, height:36, fontSize:'1.2rem',
                          background: form.avatar_emoji===e ? 'rgba(255,215,0,0.15)' : 'var(--card2)',
                          border:`2px solid ${form.avatar_emoji===e ? 'var(--gold)' : 'var(--border)'}`,
                          borderRadius:8, cursor:'pointer',
                        }}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <Button onClick={handleSave} variant="gold" size="sm" disabled={saving}>
                      {saving ? 'Saving...' : '✓ Save Changes'}
                    </Button>
                    <Button onClick={() => setEditing(false)} variant="ghost" size="sm">Cancel</Button>
                  </div>
                </>
              ) : (
                <>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2rem' }}>
                    {user.display_name || user.username}
                  </h2>
                  <div style={{ color:'var(--muted)', marginTop:4 }}>@{user.username}</div>
                  {user.is_admin && (
                    <div style={{ marginTop:8 }}>
                      <span style={{ background:'rgba(255,107,0,0.15)', color:'var(--orange)',
                                     padding:'3px 10px', borderRadius:4, fontSize:'0.72rem', fontWeight:700 }}>
                        ⚙️ ADMIN
                      </span>
                    </div>
                  )}
                  <div style={{ marginTop:16, display:'flex', gap:10 }}>
                    <Button onClick={() => setEditing(true)} variant="ghost" size="sm">✏️ Edit Profile</Button>
                    <Button onClick={logout} variant="danger" size="sm">Logout</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Season stats */}
        <Card style={{ marginBottom:24 }}>
          <SectionTitle>SEASON STATS</SectionTitle>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:12 }}>
            <StatBox label="Season Rank"    value={myRank ? `#${myRank.rank}` : '—'} accent />
            <StatBox label="Total Points"   value={myRank?.total_points?.toLocaleString() || user.total_points || 0} />
            <StatBox label="Matches Played" value={myRank?.matches_played || 0} />
            <StatBox label="Avg Per Match"  value={myRank?.avg_points || '—'} />
          </div>
        </Card>

        {/* Quick links */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Link href="/teams/build" style={{ textDecoration:'none' }}>
            <Card style={{ textAlign:'center', padding:'1.5rem', cursor:'pointer' }}>
              <div style={{ fontSize:'2rem' }}>🏏</div>
              <div style={{ fontWeight:700, marginTop:8 }}>Build Team</div>
              <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>Pick your Dream XI</div>
            </Card>
          </Link>
          <Link href="/my-teams" style={{ textDecoration:'none' }}>
            <Card style={{ textAlign:'center', padding:'1.5rem', cursor:'pointer' }}>
              <div style={{ fontSize:'2rem' }}>📋</div>
              <div style={{ fontWeight:700, marginTop:8 }}>My Teams</div>
              <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>View all submissions</div>
            </Card>
          </Link>
          <Link href="/leaderboard" style={{ textDecoration:'none' }}>
            <Card style={{ textAlign:'center', padding:'1.5rem', cursor:'pointer' }}>
              <div style={{ fontSize:'2rem' }}>🏆</div>
              <div style={{ fontWeight:700, marginTop:8 }}>Rankings</div>
              <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>See season leaderboard</div>
            </Card>
          </Link>
          <Link href="/matches" style={{ textDecoration:'none' }}>
            <Card style={{ textAlign:'center', padding:'1.5rem', cursor:'pointer' }}>
              <div style={{ fontSize:'2rem' }}>📅</div>
              <div style={{ fontWeight:700, marginTop:8 }}>Fixtures</div>
              <div style={{ color:'var(--muted)', fontSize:'0.82rem' }}>IPL schedule & scores</div>
            </Card>
          </Link>
        </div>
      </div>
    </Layout>
  )
}
