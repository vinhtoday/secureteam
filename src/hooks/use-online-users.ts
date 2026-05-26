'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface OnlineUser {
  id: string
  name: string
  email: string
  avatar?: string | null
  onlineStatus: string
  lastSeen?: string | null
}

export function useOnlineUsers() {
  return useQuery({
    queryKey: ['users', 'online'],
    queryFn: async () => {
      const res = await api.get<OnlineUser[]>('/api/v1/users/online')
      return res.data
    },
    refetchInterval: 30000,
  })
}
