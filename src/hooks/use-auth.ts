'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/stores/auth-store'

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    setUser,
  } = useAuthStore()

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshAuth,
    setUser,
    isAdmin:
      user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN',
    isSuperAdmin: user?.role?.name === 'SUPER_ADMIN',
    isLeader: user?.role?.name === 'LEADER',
    isMember: user?.role?.name === 'MEMBER',
    canManageUsers:
      user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN',
    canManageChannels:
      user?.role?.name === 'SUPER_ADMIN' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'LEADER',
    canAudit:
      user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN',
  }
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await api.get<User>(`/api/v1/users/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useAllUsers(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['users', 'all', params],
    queryFn: async () => {
      const sp = new URLSearchParams()
      if (params.search) sp.set('search', params.search)
      if (params.page) sp.set('page', String(params.page))
      if (params.limit) sp.set('limit', String(params.limit))
      const res = await api.get<User[]>(`/api/v1/users?${sp.toString()}`)
      return res
    },
  })
}
