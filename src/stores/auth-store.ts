'use client'

import { create } from 'zustand'
import { api, setAccessToken, getAccessToken } from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string
  avatar?: string | null
  bio?: string | null
  isEmailVerified: boolean
  isActive: boolean
  isLocked: boolean
  twoFactorEnabled: boolean
  lastSeen?: string | null
  onlineStatus: string
  createdAt: string
  role: {
    id: string
    name: string
    description?: string | null
    permissions: Record<string, unknown>
  }
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  refreshAuth: () => Promise<void>
  setUser: (user: User) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    try {
      const res = await api.get<User>('/api/v1/auth/me')
      set({ user: res.data, isAuthenticated: true, isInitialized: true })
    } catch {
      set({ user: null, isAuthenticated: false, isInitialized: true })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await api.post<{
        user: { id: string; email: string; name: string; role: string }
        accessToken: string
      }>('/api/v1/auth/login', { email, password })

      setAccessToken(res.data.accessToken)

      // Fetch full user profile
      const meRes = await api.get<User>('/api/v1/auth/me')
      set({
        user: meRes.data,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  register: async (email: string, password: string, name: string) => {
    set({ isLoading: true })
    try {
      await api.post('/api/v1/auth/register', { email, password, name })
      // Auto login after register
      await useAuthStore.getState().login(email, password)
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout')
    } catch {
      // Ignore logout errors
    }
    setAccessToken(null)
    set({ user: null, isAuthenticated: false })
  },

  refreshAuth: async () => {
    try {
      const res = await api.get<User>('/api/v1/auth/me')
      set({ user: res.data, isAuthenticated: true })
    } catch {
      set({ user: null, isAuthenticated: false })
    }
  },

  setUser: (user: User) => {
    set({ user })
  },
}))
