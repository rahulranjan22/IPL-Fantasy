// lib/store.ts — global state with Zustand + Supabase Auth
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from './supabase'

interface User {
  id: string
  email?: string
  username: string
  display_name: string
  avatar_emoji: string
  is_admin: boolean
  total_points: number
}

interface AuthStore {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; username: string; display_name: string; avatar_emoji: string }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
  getAccessToken: () => Promise<string | null>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })
          if (error) throw new Error(error.message)

          // Fetch profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          set({
            user: profile ? { ...profile, email } : { id: data.user.id, email, username: '', display_name: '', avatar_emoji: '🏏', is_admin: false, total_points: 0 },
            loading: false,
          })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      register: async (formData) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                username: formData.username,
                display_name: formData.display_name,
                avatar_emoji: formData.avatar_emoji,
              },
            },
          })
          if (error) throw new Error(error.message)
          if (!data.user) throw new Error('Signup failed')

          // Profile is auto-created by DB trigger; fetch it
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()

          set({
            user: profile || {
              id: data.user.id,
              email: formData.email,
              username: formData.username,
              display_name: formData.display_name,
              avatar_emoji: formData.avatar_emoji,
              is_admin: false,
              total_points: 0,
            },
            loading: false,
          })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      logout: () => {
        supabase.auth.signOut()
        set({ user: null })
      },

      fetchMe: async () => {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (!authUser) { get().logout(); return }

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single()

          if (profile) {
            set({ user: { ...profile, email: authUser.email } })
          }
        } catch {
          get().logout()
        }
      },

      getAccessToken: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? null
      },
    }),
    { name: 'ipl-auth', partialize: (s) => ({ user: s.user }) }
  )
)
