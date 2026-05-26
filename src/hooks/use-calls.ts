'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CallCreator {
  id: string
  name: string
  avatar: string | null
}

export interface CallUser {
  id: string
  name: string
  avatar: string | null
  onlineStatus: string
}

export interface CallParticipant {
  id: string
  callId: string
  userId: string
  role: string
  status: string
  joinedAt: string | null
  leftAt: string | null
  isMuted: boolean
  isCameraOff: boolean
  isScreenSharing: boolean
  raisedHand: boolean
  user: CallUser | null
}

export interface CallRoom {
  id: string
  title: string
  type: string
  status: string
  channelId: string | null
  createdBy: string
  startedAt: string
  endedAt: string | null
  duration: number
  creator: CallCreator | null
  participants: CallParticipant[]
  channel?: { id: string; name: string } | null
}

export function useCreateCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { type: string; title: string; participantIds: string[]; channelId: string }) =>
      api.post<CallRoom>('/api/v1/calls', data).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls'] }),
  })
}

export function useCall(id: string | null) {
  return useQuery({
    queryKey: ['calls', id],
    queryFn: () => api.get<CallRoom>(`/api/v1/calls/${id}`).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCalls() {
  return useQuery({
    queryKey: ['calls'],
    queryFn: () => api.get<CallRoom[]>('/api/v1/calls').then((r) => r.data),
  })
}

export function useCallHistory() {
  return useQuery({
    queryKey: ['calls', 'history'],
    queryFn: () => api.get<CallRoom[]>('/api/v1/calls/history').then((r) => r.data),
  })
}

export function useJoinCall() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (callId: string) =>
      api.post<CallRoom>(`/api/v1/calls/${callId}/join`).then((r) => r.data),
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
      queryClient.invalidateQueries({ queryKey: ['calls', callId] })
    },
  })
}

export function useLeaveCall(callId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.post(`/api/v1/calls/${callId}/leave`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
      queryClient.invalidateQueries({ queryKey: ['calls', callId] })
    },
  })
}

export function useEndCall(callId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      api.delete(`/api/v1/calls/${callId}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls'] })
      queryClient.invalidateQueries({ queryKey: ['calls', callId] })
    },
  })
}
