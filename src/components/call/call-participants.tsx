'use client'

import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Hand,
  Crown,
  Monitor,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CallParticipantsProps {
  onClose: () => void
}

export function CallParticipants({ onClose }: CallParticipantsProps) {
  const { participants } = useCallStore()
  const user = useAuthStore((s) => s.user)

  const inCall = participants.filter((p) => p.status === 'joined')
  const notJoined = participants.filter((p) => p.status !== 'joined')
  const isCurrentUserHost = inCall.some(
    (p) => p.userId === user?.id && (p.role === 'host' || p.role === 'co_host')
  )

  const handleMuteUser = async (targetUserId: string) => {
    const callId = useCallStore.getState().currentCall?.id
    if (!callId) return
    try {
      await fetch(`/api/v1/calls/${callId}/mute`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, mute: true }),
      })
    } catch {
      // Silent
    }
  }

  return (
    <div className="w-72 md:w-80 border-l border-white/10 bg-gray-900/95 backdrop-blur-xl flex flex-col animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-white/70" />
          <span className="text-sm font-semibold text-white">Người tham gia</span>
          <Badge className="bg-white/10 text-white/80 border-0 text-[10px]">
            {inCall.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {/* In call section */}
        <div className="px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-1">
            Trong cuộc gọi ({inCall.length})
          </span>
          <div className="mt-2 space-y-1">
            {inCall.map((participant) => (
              <ParticipantItem
                key={participant.userId}
                participant={participant}
                isCurrentUser={participant.userId === user?.id}
                isHost={isCurrentUserHost}
                onMute={handleMuteUser}
              />
            ))}
          </div>
        </div>

        {/* Not joined section */}
        {notJoined.length > 0 && (
          <div className="px-3 py-2 border-t border-white/5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 px-1">
              Chưa tham gia ({notJoined.length})
            </span>
            <div className="mt-2 space-y-1">
              {notJoined.map((participant) => (
                <ParticipantItem
                  key={participant.userId}
                  participant={participant}
                  isCurrentUser={participant.userId === user?.id}
                  isHost={isCurrentUserHost}
                  onMute={handleMuteUser}
                />
              ))}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

function ParticipantItem({
  participant,
  isCurrentUser,
  isHost,
  onMute,
}: {
  participant: {
    userId: string
    user?: { name?: string; avatar?: string | null } | null
    isMuted: boolean
    isCameraOff: boolean
    isScreenSharing: boolean
    raisedHand: boolean
    role: string
    status: string
  }
  isCurrentUser: boolean
  isHost: boolean
  onMute: (userId: string) => void
}) {
  const name = participant.user?.name || 'Người dùng'
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const isJoined = participant.status === 'joined'

  return (
    <div className={cn(
      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors',
      isJoined ? 'hover:bg-white/5' : 'opacity-50'
    )}>
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600">
          <span className="text-[10px] font-bold text-white">{initials}</span>
        </div>
        {!isJoined && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-gray-500 ring-2 ring-gray-900" />
        )}
      </div>

      {/* Name & status */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm font-medium truncate',
            isJoined ? 'text-white' : 'text-white/50'
          )}>
            {name}
          </span>
          {isCurrentUser && (
            <span className="text-[10px] text-white/40">(bạn)</span>
          )}
          {participant.role === 'host' && (
            <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />
          )}
          {participant.role === 'co_host' && (
            <Crown className="h-3 w-3 text-violet-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Status icons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {participant.isMuted && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/20">
            <MicOff className="h-3 w-3 text-red-400" />
          </div>
        )}
        {!participant.isMuted && isJoined && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/20">
            <Mic className="h-3 w-3 text-emerald-400" />
          </div>
        )}
        {participant.isCameraOff && isJoined && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10">
            <VideoOff className="h-3 w-3 text-white/50" />
          </div>
        )}
        {participant.isScreenSharing && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/20">
            <Monitor className="h-3 w-3 text-violet-400" />
          </div>
        )}
        {participant.raisedHand && (
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20">
            <Hand className="h-3 w-3 text-amber-400" />
          </div>
        )}

        {/* Host actions */}
        {isHost && !isCurrentUser && isJoined && !participant.isMuted && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => onMute(participant.userId)}
                aria-label={`Tắt mic ${name}`}
              >
                <MicOff className="h-2.5 w-2.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tắt mic</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
