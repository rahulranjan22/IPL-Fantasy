'use client'
// components/layout/AuthModal.tsx
import { useState } from 'react'
import { useAuthStore } from '../../lib/store'
import { Button } from '../ui'
import toast from 'react-hot-toast'

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [form, setForm] = useState({ email: '', password: '', username: '', display_name: '', avatar_emoji: '🏏' })
  const { login, register } = useAuthStore()

  const AVATARS = ['🏏','🏆','⚡','🔥','💪','🌟','🎯','👑','🦁','🚀']

  const handleSubmit = async () => {
    if (!form.email || !form.password) { toast.error('Email and password required'); return }
    if (mode === 'register' && !form.username) { toast.error('Username required'); return }
    try {
      if (mode === 'login') {
        await login(form.email, form.password)
        toast.success('Welcome back! 🏏')
      } else {
        await register(form)
        toast.success('Account created! 🎉')
      }
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Something went wrong')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999, padding: '1rem',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--card)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 18,
        padding: '2.5rem',
        width: '100%', maxWidth: 420,
        animation: 'fadeUp 0.3s ease',
        position: 'relative',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 18,
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1,
        }}>✕</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🏏</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--gold)' }}>
            {mode === 'login' ? 'WELCOME BACK' : 'JOIN THE GAME'}
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 6 }}>
            {mode === 'login' ? 'Login to manage your fantasy teams' : 'Create your IPL Fantasy account'}
          </p>
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', background: 'var(--card2)', borderRadius: 10, padding: 4, marginBottom: '1.5rem' }}>
          {(['login','register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px', border: 'none', borderRadius: 8, cursor: 'pointer',
              background: mode === m ? 'rgba(255,107,0,0.2)' : 'transparent',
              color: mode === m ? 'var(--orange)' : 'var(--muted)',
              fontFamily: 'inherit', fontWeight: 700, fontSize: '0.85rem', letterSpacing: 1,
              transition: 'all 0.15s',
            }}>{m === 'login' ? 'LOGIN' : 'SIGN UP'}</button>
          ))}
        </div>

        {/* Register fields */}
        {mode === 'register' && (
          <>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>USERNAME</div>
              <input placeholder="e.g. cricket_king_22" value={form.username}
                onChange={e => setForm(p => ({...p, username: e.target.value}))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>DISPLAY NAME</div>
              <input placeholder="Your name (shown on leaderboard)" value={form.display_name}
                onChange={e => setForm(p => ({...p, display_name: e.target.value}))} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2, marginBottom: 8 }}>PICK YOUR AVATAR</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {AVATARS.map(e => (
                  <button key={e} onClick={() => setForm(p => ({...p, avatar_emoji: e}))} style={{
                    width: 40, height: 40, fontSize: '1.3rem',
                    background: form.avatar_emoji === e ? 'rgba(255,215,0,0.15)' : 'var(--card2)',
                    border: `2px solid ${form.avatar_emoji === e ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
                  }}>{e}</button>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>EMAIL</div>
          <input type="email" placeholder="you@example.com" value={form.email}
            onChange={e => setForm(p => ({...p, email: e.target.value}))} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', letterSpacing: 2, marginBottom: 6 }}>PASSWORD</div>
          <input type="password" placeholder="••••••••" value={form.password}
            onChange={e => setForm(p => ({...p, password: e.target.value}))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>

        <Button onClick={handleSubmit} variant="gold" fullWidth size="lg">
          {mode === 'login' ? '🏏 Login' : '🎉 Create Account'}
        </Button>

        <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--muted)', fontSize: '0.85rem' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have one? '}
          <span onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            style={{ color: 'var(--orange)', cursor: 'pointer', fontWeight: 700 }}>
            {mode === 'login' ? 'Sign Up Free' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  )
}
