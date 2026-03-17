// pages/_app.tsx
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../lib/store'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  const { fetchMe, user } = useAuthStore()

  // Sync auth state on mount and when Supabase session changes
  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !user) fetchMe()
    })

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') fetchMe()
        if (event === 'SIGNED_OUT') useAuthStore.setState({ user: null })
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <>
      <Head>
        <title>CricketDream — IPL Fantasy Cricket 2025</title>
        <meta name="description" content="Play IPL Fantasy Cricket 2025 — Build your Dream XI, captain wisely, and win big every match!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="CricketDream IPL Fantasy" />
        <meta property="og:description" content="Play IPL Fantasy Cricket 2025 — Build your Dream XI and win!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
