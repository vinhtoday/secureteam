'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

// ============================================
// Types
// ============================================

export interface SearchResultUser {
  id: string
  name: string
  avatar?: string
  email?: string
  onlineStatus?: string
  department?: string
}

export interface SearchResultTask {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string
  channelId?: string
  channel?: { id: string; name: string }
}

export interface SearchResultMessage {
  id: string
  content: string
  contentType: string
  createdAt: string
  channelId: string
  channel: { id: string; name: string }
  sender: { id: string; name: string; avatar?: string }
}

export interface GlobalSearchResult {
  messages: SearchResultMessage[]
  tasks: SearchResultTask[]
  users: SearchResultUser[]
  totalResults: number
}

// ============================================
// Debounce hook
// ============================================

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

// ============================================
// Hooks
// ============================================

/**
 * Global search across messages, tasks, and users with 300ms debounce
 */
export function useGlobalSearch(query: string, params?: {
  limit?: number
  types?: ('messages' | 'tasks' | 'users')[]
}) {
  const debouncedQuery = useDebouncedValue(query, 300)

  return useQuery({
    queryKey: ['search', debouncedQuery, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('q', debouncedQuery)
      if (params?.limit) searchParams.set('limit', String(params.limit))
      if (params?.types?.length) searchParams.set('types', params.types.join(','))
      const res = await api.get<GlobalSearchResult>(
        `/api/v1/search?${searchParams.toString()}`
      )
      return res
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 1000 * 60 * 2, // Cache results for 2 minutes
  })
}
