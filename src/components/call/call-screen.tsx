'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Mic,
  MicOff,
  Phone,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Hand,
  Users,
  MessageSquare,
  Crown,
  PhoneForwarded,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSocket } from '@/hooks/use-socket'
import { useLeaveCall, useEndCall } from '@/hooks/use-calls'
import { toast } from 'sonner'

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
]

function getAvatarColor(id: string): string {
  const index =
    id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

export function CallScreen() {
  const {
    currentCall,
    callStatus,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isHandRaised,
    participants,
    callDuration,
    isRecording,
    showParticipants,
    showCallChat,
    toggleMute,
    toggleCamera,
    toggleScreenShare,
    toggleHandRaise,
    endCall,
    setShowParticipants,
    setShowCallChat,
  } = useCallStore()

  const {
    emitCallEnd,
    emitCallCancel,
    emitCallMute,
    emitCallScreenShare,
    emitCallRaiseHand,
    emitCallCamera,
  } = useSocket()

  const [duration, setDuration] = useState('00:00')

  useEffect(() => {
    if (callStatus !== 'active') return
    const start = Date.now() - callDuration * 1000
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000)
      setDuration(
        `${Math.floor(elapsed / 60)
          .toString()
          .padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`
      )
    }, 1000)
    return () => clearInterval(interval)
  }, [callStatus, callDuration])

  const leaveCallMutation = useLeaveCall(currentCall?.id || '')
  const endCallMutation = useEndCall(currentCall?.id || '')

  const handleEndCall = useCallback(async () => {
    if (!currentCall) {
      endCall()
      return
    }
    try {
      const { webrtcManager } = await import('@/lib/webrtc')
      webrtcManager.cleanup()
      emitCallEnd({ callId: currentCall.id })
      const isHost = participants.some(
        (p) => p.userId === currentCall.createdBy && p.role === 'host'
      )
      if (
        isHost ||
        currentCall.createdBy ===
          participants.find((p) => p.role === 'host')?.userId
      ) {
        await endCallMutation.mutateAsync()
      } else {
        await leaveCallMutation.mutateAsync()
      }
    } catch {
      // Ignore
    } finally {
      endCall()
    }
  }, [
    currentCall,
    participants,
    endCall,
    emitCallEnd,
    endCallMutation,
    leaveCallMutation,
  ])

  const handleCancelCall = useCallback(async () => {
    if (!currentCall) {
      endCall()
      return
    }
    try {
      for (const p of participants.filter((p) => p.status === 'ringing')) {
        emitCallCancel({ callId: currentCall.id, targetUserId: p.userId })
      }
      await endCallMutation.mutateAsync()
    } catch {
      // Ignore
    } finally {
      endCall()
      toast.info('Đã hủy cuộc gọi')
    }
  }, [currentCall, participants, endCall, emitCallCancel, endCallMutation])

  const handleToggleMute = useCallback(async () => {
    toggleMute()
    try {
      const { webrtcManager } = await import('@/lib/webrtc')
      webrtcManager.setMuted(!isMuted)
    } catch {
      // Ignore
    }
    if (currentCall) {
      const currentUser = useAuthStore.getState().user
      if (currentUser) {
        emitCallMute({
          callId: currentCall.id,
          userId: currentUser.id,
          isMuted: !isMuted,
        })
      }
    }
  }, [toggleMute, currentCall, emitCallMute, isMuted])

  const handleToggleCamera = useCallback(async () => {
    toggleCamera()
    try {
      const { webrtcManager } = await import('@/lib/webrtc')
      webrtcManager.setCameraOff(!isCameraOff)
    } catch {
      // Ignore
    }
    if (currentCall) {
      emitCallCamera({ callId: currentCall.id, isCameraOff: !isCameraOff })
    }
  }, [toggleCamera, currentCall, emitCallCamera, isCameraOff])

  const handleToggleScreenShare = useCallback(async () => {
    try {
      const { webrtcManager } = await import('@/lib/webrtc')
      if (!isScreenSharing) {
        const screenStream = await webrtcManager.startScreenShare()
        const screenTrack = screenStream.getVideoTracks()[0]
        if (screenTrack) await webrtcManager.replaceTrackOnAllPeers(screenTrack)
        const callStore = useCallStore.getState()
        if (callStore.localStream) {
          const s = new MediaStream(callStore.localStream.getAudioTracks())
          if (screenTrack) s.addTrack(screenTrack)
          callStore.setLocalStream(s)
        }
        toggleScreenShare()
        toast.success('Đang chia sẻ màn hình')
      } else {
        webrtcManager.stopScreenShare()
        const cameraStream = webrtcManager.getLocalStream()
        if (cameraStream) {
          const ct = cameraStream.getVideoTracks()[0]
          if (ct) await webrtcManager.replaceTrackOnAllPeers(ct)
          useCallStore.getState().setLocalStream(cameraStream)
        }
        toggleScreenShare()
        toast.info('Đã dừng chia sẻ màn hình')
      }
      if (currentCall) {
        emitCallScreenShare({
          callId: currentCall.id,
          sharing: !isScreenSharing,
        })
      }
    } catch (error: unknown) {
      const err = error as { message?: string }
      if (!isScreenSharing) {
        toast.error(err?.message || 'Không thể chia sẻ màn hình')
      }
    }
  }, [toggleScreenShare, currentCall, emitCallScreenShare, isScreenSharing])

  const handleToggleRaiseHand = useCallback(() => {
    toggleHandRaise()
    if (currentCall) {
      emitCallRaiseHand({ callId: currentCall.id, raised: !isHandRaised })
    }
  }, [toggleHandRaise, currentCall, emitCallRaiseHand, isHandRaised])

  if (callStatus !== 'active' && callStatus !== 'ringing') return null

  const isVideoCall = currentCall?.type?.includes('video')
  const joinedParticipants = participants.filter((p) => p.status === 'joined')
  const ringingParticipants = participants.filter((p) => p.status === 'ringing')

  // Ringing screen
  if (callStatus === 'ringing') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950 text-white">
        <div className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm">
          <div className="text-sm font-medium">
            {currentCall?.title || 'Cuộc gọi'}
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
            <PhoneForwarded className="h-3 w-3 mr-1" />
            Đang gọi...
          </Badge>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-4">
          <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/40 animate-[ring-pulse_2s_ease-in-out_infinite]" />
            <div
              className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-[ring-pulse_2s_ease-in-out_infinite]"
              style={{ animationDelay: '0.5s' }}
            />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl font-bold text-white shadow-lg shadow-violet-500/30">
              {isVideoCall ? (
                <Video className="h-10 w-10" />
              ) : (
                <Phone className="h-10 w-10" />
              )}
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-1">
            Cuộc gọi {isVideoCall ? 'video' : 'thoại'}
          </h2>
          <p className="text-white/50 text-sm mb-8">{currentCall?.title}</p>

          {ringingParticipants.length > 0 && (
            <div className="w-full max-w-md space-y-2 mb-8">
              <div className="text-xs text-white/40 text-center mb-3">
                Đang gọi {ringingParticipants.length} người...
              </div>
              {ringingParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shrink-0',
                      getAvatarColor(p.userId)
                    )}
                  >
                    {p.user?.name ? getInitials(p.user.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.user?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                      Đang đổ chuông...
                    </div>
                  </div>
                  <Phone className="h-4 w-4 text-amber-400 animate-bounce" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 px-4 py-6 bg-black/30 backdrop-blur-sm">
          <Button
            size="lg"
            className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-transform active:scale-95"
            onClick={handleCancelCall}
          >
            <PhoneOff className="h-7 w-7 rotate-[135deg]" />
          </Button>
        </div>
      </div>
    )
  }

  // Active call screen
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {isRecording && (
            <Badge
              variant="destructive"
              className="gap-1 animate-pulse"
            >
              <div className="h-2 w-2 rounded-full bg-white" />
              REC
            </Badge>
          )}
          <div className="text-sm font-medium">
            {currentCall?.title || 'Cuộc gọi'}
          </div>
        </div>
        <div className="text-sm font-mono text-white/80">{duration}</div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Users className="h-3.5 w-3.5" />
          {joinedParticipants.length} người
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4">
          {isVideoCall ? (
            <VideoGrid participants={joinedParticipants} />
          ) : (
            <VoiceCallView participants={joinedParticipants} />
          )}
        </div>

        {/* Participants sidebar */}
        {showParticipants && (
          <div className="w-72 border-l border-white/10 bg-black/40 backdrop-blur-sm overflow-y-auto">
            <div className="p-3 border-b border-white/10">
              <h3 className="text-sm font-semibold">
                Người tham gia ({joinedParticipants.length})
              </h3>
            </div>
            <div className="p-2 space-y-1">
              {joinedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5"
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shrink-0',
                      getAvatarColor(p.userId)
                    )}
                  >
                    {p.user?.name ? getInitials(p.user.name) : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {p.user?.name || 'Unknown'}
                      {p.role === 'host' && (
                        <Crown className="inline h-3 w-3 ml-1 text-amber-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white/50">
                      {p.isMuted && <MicOff className="h-3 w-3 text-red-400" />}
                      {p.isCameraOff && (
                        <VideoOff className="h-3 w-3 text-red-400" />
                      )}
                      {p.isScreenSharing && (
                        <MonitorUp className="h-3 w-3 text-blue-400" />
                      )}
                      {p.isHandRaised && (
                        <Hand className="h-3 w-3 text-amber-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-black/30 backdrop-blur-sm">
        <ControlButton
          icon={isMuted ? MicOff : Mic}
          active={isMuted}
          activeColor="text-red-400"
          label={isMuted ? 'Bật mic' : 'Tắt mic'}
          onClick={handleToggleMute}
        />
        <ControlButton
          icon={isCameraOff ? VideoOff : Video}
          active={isCameraOff}
          activeColor="text-red-400"
          label={isCameraOff ? 'Bật camera' : 'Tắt camera'}
          onClick={handleToggleCamera}
        />
        <ControlButton
          icon={MonitorUp}
          active={isScreenSharing}
          activeColor="text-blue-400"
          label={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
          onClick={handleToggleScreenShare}
        />
        <ControlButton
          icon={Hand}
          active={isHandRaised}
          activeColor="text-amber-400"
          label={isHandRaised ? 'Hạ tay' : 'Giơ tay'}
          onClick={handleToggleRaiseHand}
        />
        <ControlButton
          icon={Users}
          active={showParticipants}
          label="Danh sách"
          onClick={() => {
            setShowParticipants(!showParticipants)
            setShowCallChat(false)
          }}
        />
        <ControlButton
          icon={MessageSquare}
          active={showCallChat}
          label="Chat"
          onClick={() => {
            setShowCallChat(!showCallChat)
            setShowParticipants(false)
          }}
        />
        <div className="mx-2" />
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-transform active:scale-95"
          onClick={handleEndCall}
        >
          <PhoneOff className="h-6 w-6 rotate-[135deg]" />
        </Button>
      </div>
    </div>
  )
}

// ===== Sub-components =====

function ControlButton({
  icon: Icon,
  active,
  activeColor,
  label,
  onClick,
}: {
  icon: React.ElementType
  active?: boolean
  activeColor?: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-2xl transition-all active:scale-95',
        active
          ? `bg-white/15 ${activeColor || 'text-primary'}`
          : 'bg-white/10 hover:bg-white/20 text-white'
      )}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] leading-none opacity-70">{label}</span>
    </button>
  )
}

function VideoGrid({
  participants,
}: {
  participants: Array<{
    id: string
    userId: string
    user?: { name?: string } | null
    isMuted: boolean
    isCameraOff: boolean
  }>
}) {
  const { localStream, remoteStreams } = useCallStore()
  const user = useAuthStore((s) => s.user)

  const tiles: Array<{
    userId: string
    name: string
    stream: MediaStream | null
    isMuted: boolean
    isCameraOff: boolean
    isSelf: boolean
  }> = []

  const hasLocalStream =
    localStream && localStream.getVideoTracks().length > 0
  if (hasLocalStream && user) {
    tiles.push({
      userId: user.id,
      name: user.name + ' (Bạn)',
      stream: localStream,
      isMuted: false,
      isCameraOff: false,
      isSelf: true,
    })
  }

  for (const p of participants) {
    // Skip if this participant is the local user (already added above)
    if (user && p.userId === user.id) continue
    tiles.push({
      userId: p.userId,
      name: p.user?.name || 'Unknown',
      stream: remoteStreams.get(p.userId) || null,
      isMuted: p.isMuted,
      isCameraOff: p.isCameraOff,
      isSelf: false,
    })
  }

  if (!tiles.length) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-white/60">
          <Video className="mx-auto h-16 w-16 mb-4 opacity-30" />
          <p>Đang chờ người tham gia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col gap-2">
      <div
        className={cn(
          'grid gap-2 flex-1',
          tiles.length === 2 && 'grid-cols-2',
          tiles.length > 2 && 'grid-cols-2'
        )}
      >
        {tiles.map((tile) => (
          <ParticipantVideoTile key={tile.userId} {...tile} />
        ))}
      </div>
    </div>
  )
}

function ParticipantVideoTile({
  userId,
  name,
  stream,
  isMuted,
  isCameraOff,
  isSelf,
}: {
  userId: string
  name: string
  stream: MediaStream | null
  isMuted: boolean
  isCameraOff: boolean
  isSelf: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Check for ACTUAL video tracks that are enabled, not just stream existence
  const hasVideo = !!stream && !isCameraOff && stream.getVideoTracks().filter(t => t.enabled && t.readyState !== 'ended').length > 0

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    if (stream && hasVideo) {
      el.srcObject = stream
      // Attempt to play — some browsers block autoplay without user gesture
      el.play().catch(() => {
        console.warn(`[VideoTile] Autoplay blocked for ${name}, waiting for user interaction`)
      })
    } else {
      el.srcObject = null
    }
    return () => {
      if (el) el.srcObject = null
    }
  }, [stream, hasVideo, name])

  // Re-check video tracks when stream changes (new tracks may arrive after initial connection)
  useEffect(() => {
    if (!stream) return
    const handler = () => {
      // Force re-render by triggering a state update via the video element
      const el = videoRef.current
      if (el && stream.getVideoTracks().filter(t => t.enabled && t.readyState !== 'ended').length > 0) {
        el.srcObject = stream
        el.play().catch(() => {})
      }
    }
    stream.addEventListener('addtrack', handler)
    stream.addEventListener('removetrack', handler)
    return () => {
      stream.removeEventListener('addtrack', handler)
      stream.removeEventListener('removetrack', handler)
    }
  }, [stream])

  return (
    <div
      className={cn(
        'aspect-video rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center border border-white/10 relative overflow-hidden',
        isSelf && 'border-violet-500/30'
      )}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isSelf}
        playsInline={true}
        className={cn('absolute inset-0 w-full h-full object-cover', !hasVideo && 'hidden')}
      />
      {!hasVideo && (
        <div className="text-center">
          <div
            className={cn(
              'mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white',
              getAvatarColor(userId)
            )}
          >
            {name ? getInitials(name) : '?'}
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-xs font-medium bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
          {name}
        </span>
        {isMuted && <MicOff className="h-3.5 w-3.5 text-red-400" />}
      </div>
    </div>
  )
}

function VoiceCallView({
  participants,
}: {
  participants: Array<{
    id: string
    userId: string
    user?: { name?: string } | null
    isMuted: boolean
  }>
}) {
  const { remoteStreams } = useCallStore()
  const mainParticipant = participants[0]
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())

  useEffect(() => {
    for (const p of participants) {
      const stream = remoteStreams.get(p.userId)
      if (stream && stream.getAudioTracks().length > 0) {
        let audioEl = audioRefs.current.get(p.userId)
        if (!audioEl) {
          audioEl = document.createElement('audio')
          audioEl.autoplay = true
          audioEl.id = `remote-audio-${p.userId}`
          document.body.appendChild(audioEl)
          audioRefs.current.set(p.userId, audioEl)
        }
        if (audioEl.srcObject !== stream) {
          audioEl.srcObject = stream
          audioEl.muted = false
          audioEl.play().catch(() => {
            const retry = () => {
              audioEl!.play().catch(() => {})
            }
            document.addEventListener('click', retry, { once: true })
          })
        }
      }
    }

    // Cleanup stale audio elements
    for (const [userId, el] of audioRefs.current) {
      if (!participants.find((p) => p.userId === userId)) {
        el.srcObject = null
        el.remove()
        audioRefs.current.delete(userId)
      }
    }

    return () => {
      for (const [, el] of audioRefs.current) {
        el.srcObject = null
        el.remove()
      }
      audioRefs.current.clear()
    }
  }, [participants, remoteStreams])

  return (
    <div className="text-center">
      {mainParticipant ? (
        <>
          <div
            className={cn(
              'mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br text-4xl font-bold text-white shadow-2xl mb-6',
              getAvatarColor(mainParticipant.userId)
            )}
          >
            {mainParticipant.user?.name
              ? getInitials(mainParticipant.user.name)
              : '?'}
          </div>
          <h2 className="text-2xl font-semibold">
            {mainParticipant.user?.name || 'Unknown'}
          </h2>
          <p className="mt-2 text-white/50 text-sm flex items-center justify-center gap-1">
            {mainParticipant.isMuted ? (
              <>
                <MicOff className="h-3.5 w-3.5" /> Đã tắt mic
              </>
            ) : (
              'Đang nói...'
            )}
          </p>
        </>
      ) : (
        <>
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white/10 mb-6">
            <Phone className="h-16 w-16 text-white/20" />
          </div>
          <h2 className="text-xl text-white/60">Đang chờ người tham gia...</h2>
        </>
      )}
      {participants.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          {participants.slice(1, 5).map((p) => (
            <div key={p.id} className="relative">
              <div
                className={cn(
                  'flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white border-2 border-white/20',
                  getAvatarColor(p.userId)
                )}
              >
                {p.user?.name ? getInitials(p.user.name) : '?'}
              </div>
              {p.isMuted && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                  <MicOff className="h-3 w-3" />
                </div>
              )}
            </div>
          ))}
          {participants.length > 5 && (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-sm">
              +{participants.length - 5}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
