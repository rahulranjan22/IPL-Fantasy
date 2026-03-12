/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',   // static export → deploy to Vercel as static site
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_API_URL:         process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL:    process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON:   process.env.NEXT_PUBLIC_SUPABASE_ANON,
  }
}
module.exports = nextConfig
