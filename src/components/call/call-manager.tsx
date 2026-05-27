'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { useSocket } from '@/hooks/use-socket'
import type { CallRoom, CallParticipant } from '@/hooks/use-calls'
import { IncomingCallDialog } from './incoming-call-dialog'
import { CallScreen } from './call-screen'
import { toast } from 'sonner'

export function CallManager() {
  const {
    incomingCall,
    callStatus,
    setCallStatus,
    setCurrentCall,
    setIncomingCall,
    setShowCallUI,
    setParticipants,
    endCall,
  } = useCallStore()
  const { emitCallAccept, emitCallJoin, emitCallReject, emitCallEnd } =
    useSocket()

  const [isJoining, setIsJoining] = useState(false)
  const [localIncomingCall, setLocalIncomingCall] =
    useState<typeof incomingCall>(null)

  useEffect(() => {
    if (incomingCall) setLocalIncomingCall(incomingCall)
  }, [incomingCall])

  const handleAcceptCall = useCallback(async () => {
    if (!localIncomingCall) return
    setIsJoining(true)

    try {
      // 1. Join call via API
      const res = await api.post<CallRoom>(
        `/api/v1/calls/${localIncomingCall.callId}/join`
      )
      const callRoom = res.data

      // 2. Set call state FIRST — CRITICAL: before emitting any socket events
      // This ensures incoming signals (offer/answer/ice) won't be dropped
      // by the signal guard that checks currentCall?.id
      setCurrentCall(callRoom)
      setCallStatus('active')
      setShowCallUI(true)

      // 3. Create local media stream — before emitting call:accept
      // This ensures when the caller's offer arrives, our local tracks are ready
      try {
        const { webrtcManager } = await import('@/lib/webrtc')
        const isVideo = localIncomingCall.callType.includes('video')
        webrtcManager.setCallId(localIncomingCall.callId)

        // Set local user ID for self-signaling prevention
        const currentUser = useAuthStore.getState().user
        if (currentUser?.id) webrtcManager.setLocalUserId(currentUser.id)

        // Set callbacks BEFORE creating stream
        webrtcManager.onRemoteStream((userId, stream) => {
          useCallStore.getState().addRemoteStream(userId, stream)
        })
        webrtcManager.onRemoteStreamRemove((userId) => {
          useCallStore.getState().removeRemoteStream(userId)
        })

        const localStream = await webrtcManager.createLocalStream(isVideo)
        useCallStore.getState().setLocalStream(localStream)
      } catch (mediaError) {
        console.warn('[CallManager] Could not get media:', mediaError)
      }

      // 4. NOW emit socket events (after currentCall is set AND local stream is ready)
      emitCallAccept({ callId: localIncomingCall.callId })
      emitCallJoin({ callId: localIncomingCall.callId })

      // 5. Clear incoming call dialog
      setIncomingCall(null)
      setLocalIncomingCall(null)

      // 6. Set participants
      if (callRoom.participants) {
        setParticipants(
          callRoom.participants.map((p: CallParticipant) => ({
            ...p,
            user: p.user || {
              id: p.userId,
              name: 'Unknown',
              avatar: null,
              onlineStatus: 'online',
            },
          }))
        )
      }

      toast.success('Đã tham gia cuộc gọi')
    } catch (error) {
      console.error('Failed to join call:', error)
      toast.error('Không thể tham gia cuộc gọi')
      setLocalIncomingCall(null)
      setIncomingCall(null)
    } finally {
      setIsJoining(false)
    }
  }, [
    localIncomingCall,
    setIncomingCall,
    setCurrentCall,
    setCallStatus,
    setShowCallUI,
    setParticipants,
    emitCallAccept,
    emitCallJoin,
  ])

  const handleRejectCall = useCallback(async () => {
    if (!localIncomingCall) return
    try {
      emitCallReject({ callId: localIncomingCall.callId })
    } catch {
      // Ignore
    }
    setLocalIncomingCall(null)
    setIncomingCall(null)
  }, [localIncomingCall, setIncomingCall, emitCallReject])

  return (
    <>
      {localIncomingCall && (
        <IncomingCallDialog
          callerName={localIncomingCall.callerName}
          callerAvatar={localIncomingCall.callerAvatar}
          callType={
            localIncomingCall.callType as 'voice' | 'video'
          }
          callId={localIncomingCall.callId}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}
      {(callStatus === 'active' || callStatus === 'ringing') && <CallScreen />}
    </>
  )
}
