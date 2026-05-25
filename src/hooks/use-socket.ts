'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { getAccessToken } from '@/lib/api'

export interface TypingUser {
  userId: string
  channelId: string
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const joinChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join-channel', channelId)
    }
  }, [])

  const leaveChannel = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-channel', channelId)
    }
  }, [])

  const sendMessage = useCallback(
    (data: {
      channelId: string
      message: {
        id: string
        content: string
        contentType: string
        senderId: string
        senderName: string
        createdAt: string
        replyToId?: string
      }
    }) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('send-message', data)
      }
    },
    []
  )

  const sendTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { channelId })
    }
  }, [])

  const sendStopTyping = useCallback((channelId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop-typing', { channelId })
    }
  }, [])

  const onNewMessage = useCallback(
    (handler: (data: { channelId: string; [key: string]: unknown }) => void) => {
      if (socketRef.current) {
        socketRef.current.on('new-message', handler)
        return () => {
          socketRef.current?.off('new-message', handler)
        }
      }
    },
    []
  )

  // Connect/disconnect socket based on auth state
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect when not authenticated
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      return
    }

    // Don't reconnect if already connected
    if (socketRef.current?.connected) return

    const token = getAccessToken()
    if (!token) return

    const socket = io('/?XTransformPort=3004', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setIsConnected(true)
      socket.emit('authenticate', token, (success: boolean) => {
        if (success) {
          console.log('[Socket] Authenticated')
        } else {
          console.log('[Socket] Auth failed')
          socket.disconnect()
        }
      })
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.log('[Socket] Connection error:', error.message)
    })

    socket.on('online-users', (users: { userId: string }[]) => {
      setOnlineUsers(users.map((u) => u.userId))
    })

    socket.on('user:status', (data: { userId: string; status: string }) => {
      setOnlineUsers((prev) => {
        if (data.status === 'offline') {
          return prev.filter((id) => id !== data.userId)
        }
        if (!prev.includes(data.userId)) {
          return [...prev, data.userId]
        }
        return prev
      })
    })

    socket.on('user:typing', (data: TypingUser) => {
      setTypingUsers((prev) => {
        if (prev.find((t) => t.userId === data.userId && t.channelId === data.channelId)) {
          return prev
        }
        return [...prev, data]
      })
    })

    socket.on('user:stop-typing', (data: TypingUser) => {
      setTypingUsers((prev) =>
        prev.filter((t) => !(t.userId === data.userId && t.channelId === data.channelId))
      )
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user])

  return {
    isConnected,
    onlineUsers,
    typingUsers,
    joinChannel,
    leaveChannel,
    sendMessage,
    sendTyping,
    sendStopTyping,
    onNewMessage,
  }
}
