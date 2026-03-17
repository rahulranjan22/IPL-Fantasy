// lib/supabase.ts — Supabase client helpers

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON!

// ── Browser client (used in components & pages) ─────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ── Server client with user's token (used in API routes for RLS) ──
export function createServerClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  })
}

// ── Admin client (used in API routes for admin operations) ──
export function createAdminClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ── Extract user from API request ───────────────────────────
export async function getUserFromRequest(authHeader: string | undefined) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await createServerClient(token).auth.getUser(token)
  if (error || !user) return null
  return { id: user.id, token }
}

// ── Check admin status ──────────────────────────────────────
export async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('is_admin').eq('id', userId).single()
  return data?.is_admin === true
}
