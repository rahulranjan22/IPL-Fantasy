// lib/store.ts — global state with Zustand
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth as authApi, setToken, clearToken } from './api'

interface User {
  id: string
  username: string
  display_name: string
  avatar_emoji: string
  is_admin: boolean
  total_points: number
}

interface AuthStore {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      loading: false,

      login: async (email, password) => {
        set({ loading: true })
        try {
          const res = await authApi.login({ email, password })
          setToken(res.access_token)
          set({ token: res.access_token, user: res.user, loading: false })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      register: async (data) => {
        set({ loading: true })
        try {
          const res = await authApi.register(data)
          setToken(res.access_token)
          set({ token: res.access_token, user: res.user, loading: false })
        } catch (e) {
          set({ loading: false })
          throw e
        }
      },

      logout: () => {
        clearToken()
        set({ user: null, token: null })
        window.location.href = '/login'
      },

      fetchMe: async () => {
        try {
          const user = await authApi.me()
          set({ user })
        } catch {
          get().logout()
        }
      },
    }),
    { name: 'ipl-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
)
