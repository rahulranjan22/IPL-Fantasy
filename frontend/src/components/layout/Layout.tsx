// components/layout/Layout.tsx
import { ReactNode, useState } from 'react'
import Navbar from './Navbar'
import AuthModal from './AuthModal'
import { Toaster } from 'react-hot-toast'

export default function Layout({ children }: { children: ReactNode }) {
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <Toaster position="top-right" toastOptions={{
        style: { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' },
        success: { iconTheme: { primary: 'var(--green)', secondary: 'var(--card)' } },
        error:   { iconTheme: { primary: 'var(--red)',   secondary: 'var(--card)' } },
      }} />
      <Navbar onAuthClick={() => setShowAuth(true)} />
      <main>{children}</main>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '2rem 0',
        marginTop: '4rem',
        color: 'var(--muted)',
        fontSize: '0.8rem',
      }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                        background: 'linear-gradient(135deg,var(--orange),var(--gold))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🏏 CRICKETDREAM FANTASY
          </div>
          <div>© 2025 CricketDream · IPL Fantasy Platform · Built for cricket fans</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ cursor: 'pointer' }}>Privacy</span>
            <span style={{ cursor: 'pointer' }}>Terms</span>
            <span style={{ cursor: 'pointer' }}>Contact</span>
          </div>
        </div>
      </footer>
    </>
  )
}
