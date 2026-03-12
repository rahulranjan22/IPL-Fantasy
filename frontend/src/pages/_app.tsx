// pages/_app.tsx
import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
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
