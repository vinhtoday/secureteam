'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'
import { useCallStore } from '@/stores/call-store'
import { getAccessToken } from '@/lib/api'
import { toast } from 'sonner'

export interface TypingUser {
  userId: string
  userName: string
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

  // ===== Call emitters =====
  const emitCallInvite = useCallback(
    (data: {
      callId: string
      targetUserId: string
      callType: string
      callerName: string
      callerAvatar?: string | null
    }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:invite', data)
    },
    []
  )

  const emitCallAccept = useCallback((data: { callId: string }) => {
    if (socketRef.current?.connected) socketRef.current.emit('call:accept', data)
  }, [])

  const emitCallReject = useCallback((data: { callId: string }) => {
    if (socketRef.current?.connected) socketRef.current.emit('call:reject', data)
  }, [])

  const emitCallJoin = useCallback((data: { callId: string }) => {
    if (socketRef.current?.connected) socketRef.current.emit('call:join', data)
  }, [])

  const emitCallLeave = useCallback((data: { callId: string }) => {
    if (socketRef.current?.connected) socketRef.current.emit('call:leave', data)
  }, [])

  const emitCallMute = useCallback(
    (data: { callId: string; userId: string; isMuted: boolean }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:mute', data)
    },
    []
  )

  const emitCallScreenShare = useCallback(
    (data: { callId: string; sharing: boolean }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:screen-share', data)
    },
    []
  )

  const emitCallRaiseHand = useCallback(
    (data: { callId: string; raised: boolean }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:raise-hand', data)
    },
    []
  )

  const emitCallEnd = useCallback((data: { callId: string }) => {
    if (socketRef.current?.connected) socketRef.current.emit('call:end', data)
  }, [])

  const emitCallCamera = useCallback(
    (data: { callId: string; isCameraOff: boolean }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:camera', data)
    },
    []
  )

  const emitCallCancel = useCallback(
    (data: { callId: string; targetUserId: string }) => {
      if (socketRef.current?.connected) socketRef.current.emit('call:cancel', data)
    },
    []
  )

  // ===== Socket connection =====
  useEffect(() => {
    if (!isAuthenticated || !user) {
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
        if (
          prev.find(
            (t) => t.userId === data.userId && t.channelId === data.channelId
          )
        ) {
          return prev
        }
        return [
          ...prev,
          { ...data, userName: data.userName || 'Someone' },
        ]
      })
    })

    socket.on('user:stop-typing', (data: TypingUser) => {
      setTypingUsers((prev) =>
        prev.filter(
          (t) => !(t.userId === data.userId && t.channelId === data.channelId)
        )
      )
    })

    // ===== CALL EVENTS =====
    socket.on(
      'call:invite',
      (data: {
        callId: string
        callerId: string
        callerName: string
        callerAvatar?: string | null
        callType: string
      }) => {
        const callStore = useCallStore.getState()
        if (
          data.callerId !== user?.id &&
          !callStore.currentCall &&
          !callStore.incomingCall
        ) {
          callStore.setIncomingCall({
            callId: data.callId,
            callerId: data.callerId,
            callerName: data.callerName,
            callerAvatar: data.callerAvatar,
            callType: data.callType as
              | 'voice'
              | 'video'
              | 'group_voice'
              | 'group_video',
            timestamp: new Date().toISOString(),
          })
        }
      }
    )

    socket.on(
      'call:accept',
      async (data: { callId: string; userId: string; userName: string }) => {
        const callStore = useCallStore.getState()
        if (callStore.currentCall?.id === data.callId) {
          callStore.updateParticipant(data.userId, { status: 'joined' })
          if (callStore.callStatus === 'ringing') callStore.setCallStatus('active')

          // Caller: create WebRTC offer to the newly joined participant
          try {
            const { webrtcManager } = await import('@/lib/webrtc')
            if (webrtcManager.getLocalStream()) {
              webrtcManager.setCallId(data.callId)
              const offer = await webrtcManager.createOffer(data.userId)
              if (offer) {
                webrtcManager.sendSignal(data.callId, data.userId, {
                  type: 'offer',
                  sdp: offer.sdp,
                })
              }
            }
          } catch (err) {
            console.error('[Socket] Failed to create offer:', err)
          }
        }
      }
    )

    socket.on(
      'call:reject',
      (data: { callId: string; userId: string }) => {
        const callStore = useCallStore.getState()
        if (callStore.currentCall?.id === data.callId) {
          callStore.updateParticipant(data.userId, { status: 'rejected' })
        }
      }
    )

    socket.on(
      'call:cancel',
      (data: { callId: string; callerId: string }) => {
        const callStore = useCallStore.getState()
        if (callStore.incomingCall?.callId === data.callId) {
          callStore.setIncomingCall(null)
        }
      }
    )

    socket.on(
      'call:join',
      (data: { callId: string; userId: string; userName?: string }) => {
        const callStore = useCallStore.getState()
        if (callStore.currentCall?.id === data.callId) {
          callStore.addParticipant({
            id: `p-${data.userId}`,
            callId: data.callId,
            userId: data.userId,
            role: 'participant',
            status: 'joined',
            joinedAt: new Date().toISOString(),
            isMuted: false,
            isCameraOff: false,
            isScreenSharing: false,
            raisedHand: false,
            user: {
              id: data.userId,
              name: data.userName || 'Unknown',
              avatar: null,
              onlineStatus: 'online',
            },
          })
        }
      }
    )

    socket.on('call:leave', (data: { callId: string; userId: string }) => {
      useCallStore.getState().removeParticipant(data.userId)
    })

    socket.on(
      'call:mute',
      (data: { callId: string; userId: string; isMuted: boolean }) => {
        const callStore = useCallStore.getState()
        if (data.callId === callStore.currentCall?.id) {
          callStore.updateParticipant(data.userId, { isMuted: data.isMuted })
        }
      }
    )

    socket.on(
      'call:screen-share',
      (data: { callId: string; userId: string; sharing: boolean }) => {
        const callStore = useCallStore.getState()
        if (data.callId === callStore.currentCall?.id) {
          callStore.updateParticipant(data.userId, {
            isScreenSharing: data.sharing,
          })
        }
      }
    )

    socket.on(
      'call:raise-hand',
      (data: { callId: string; userId: string; raised: boolean }) => {
        const callStore = useCallStore.getState()
        if (data.callId === callStore.currentCall?.id) {
          callStore.updateParticipant(data.userId, { raisedHand: data.raised })
        }
      }
    )

    socket.on(
      'call:camera',
      (data: { callId: string; userId: string; isCameraOff: boolean }) => {
        const callStore = useCallStore.getState()
        if (data.callId === callStore.currentCall?.id) {
          callStore.updateParticipant(data.userId, {
            isCameraOff: data.isCameraOff,
          })
        }
      }
    )

    socket.on('call:end', (data: { callId: string }) => {
      const callStore = useCallStore.getState()
      if (callStore.currentCall?.id === data.callId) {
        callStore.setCallStatus('ended')
        toast.info('Cuộc gọi đã kết thúc')
        setTimeout(() => callStore.resetCall(), 1500)
      }
    })

    // WebRTC signaling — simple fire-and-forget with try-catch
    socket.on(
      'call:signal',
      async (data: {
        callId: string
        fromUserId: string
        signal: unknown
      }) => {
        try {
          const callStore = useCallStore.getState()
          // Only drop if we have a different active call
          if (data.callId && callStore.currentCall?.id && callStore.currentCall.id !== data.callId) {
            return
          }

          const { handleOffer, handleAnswer, handleIceCandidate, webrtcManager } =
            await import('@/lib/webrtc')
          const signal = data.signal as {
            type: string
            sdp?: string
            candidate?: RTCIceCandidateInit
          }
          if (data.callId) webrtcManager.setCallId(data.callId)

          switch (signal.type) {
            case 'offer':
              await handleOffer(data.fromUserId, {
                type: 'offer',
                sdp: signal.sdp!,
              })
              break
            case 'answer':
              await handleAnswer(data.fromUserId, {
                type: 'answer',
                sdp: signal.sdp!,
              })
              break
            case 'ice-candidate':
              await handleIceCandidate(data.fromUserId, signal.candidate!)
              break
          }
        } catch (error) {
          console.error('[Socket] Failed to handle signal:', error)
        }
      }
    )

    // Init WebRTC with socket
    import('@/lib/webrtc').then(({ webrtcManager }) =>
      webrtcManager.initSocket(socket)
    )

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated, user?.id])

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
    emitCallInvite,
    emitCallAccept,
    emitCallReject,
    emitCallJoin,
    emitCallLeave,
    emitCallMute,
    emitCallScreenShare,
    emitCallRaiseHand,
    emitCallEnd,
    emitCallCamera,
    emitCallCancel,
  }
}
