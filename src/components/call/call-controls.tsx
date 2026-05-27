'use client'

import { useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Phone, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCreateCall } from '@/hooks/use-calls'
import { useCallStore } from '@/stores/call-store'
import { useAuthStore } from '@/stores/auth-store'
import { useSocket } from '@/hooks/use-socket'
import { toast } from 'sonner'
import type { ChannelDetail } from '@/hooks/use-channels'

interface CallControlsProps {
  channel: { id: string; name: string }
  channelMembers?: ChannelDetail['members']
  className?: string
}

export function CallControls({
  channel,
  channelMembers,
  className,
}: CallControlsProps) {
  const createCall = useCreateCall()
  const user = useAuthStore((s) => s.user)
  const { setCurrentCall, setCallStatus, setShowCallUI, setParticipants } =
    useCallStore()
  const { emitCallInvite, emitCallJoin } = useSocket()

  const startCall = useCallback(
    async (type: 'voice' | 'video') => {
      if (!user) {
        toast.error('Vui lòng đăng nhập')
        return
      }

      try {
        // Build participant list
        let participantIds: string[] = []
        if (channelMembers && channelMembers.length > 0) {
          participantIds = channelMembers
            .filter((m) => (m.userId || m.user?.id) !== user.id)
            .map((m) => (m.userId || m.user?.id))
            .filter((id): id is string => typeof id === 'string')
        }

        // If no members from prop, fetch from API
        if (participantIds.length === 0) {
          const { api } = await import('@/lib/api')
          const membersRes = await api.get<any>(
            `/api/v1/channels/${channel.id}`
          )
          const channelData = membersRes.data
          if (channelData?.members) {
            participantIds = channelData.members
              .filter((m: any) => (m.userId || m.user?.id) !== user.id)
              .map((m: any) => (m.userId || m.user?.id))
              .filter((id: any): id is string => typeof id === 'string')
          }
        }

        if (!participantIds.length) {
          toast.error('Không có thành viên nào khác')
          return
        }

        const callType =
          participantIds.length === 1
            ? type
            : (`group_${type}` as 'group_voice' | 'group_video')

        const callRoom = await createCall.mutateAsync({
          type: callType,
          title: channel.name,
          participantIds,
          channelId: channel.id,
        })

        // Set call state
        setCurrentCall(callRoom)
        setCallStatus('ringing')
        setShowCallUI(true)
        if (callRoom.participants) {
          setParticipants(
            callRoom.participants.map((p) => ({
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

        // IMPORTANT: Create local stream FIRST, before inviting others
        // This ensures the stream is ready when the callee's answer arrives
        try {
          const { webrtcManager } = await import('@/lib/webrtc')
          webrtcManager.setCallId(callRoom.id)
          webrtcManager.setLocalUserId(user.id)
          const localStream = await webrtcManager.createLocalStream(
            type === 'video'
          )
          useCallStore.getState().setLocalStream(localStream)
          webrtcManager.onRemoteStream((userId, stream) =>
            useCallStore.getState().addRemoteStream(userId, stream)
          )
          webrtcManager.onRemoteStreamRemove((userId) =>
            useCallStore.getState().removeRemoteStream(userId)
          )
        } catch (mediaError) {
          console.warn('[CallControls] Could not get media:', mediaError)
        }

        // Now emit socket events (after local stream is ready)
        for (const targetUserId of participantIds) {
          emitCallInvite({
            callId: callRoom.id,
            targetUserId,
            callType: callRoom.type,
            callerName: user.name,
            callerAvatar: user.avatar || null,
          })
        }
        emitCallJoin({ callId: callRoom.id })

        toast.success(`Đang gọi ${type === 'video' ? 'video' : 'thoại'}...`)
      } catch (error) {
        console.error('Failed to start call:', error)
        toast.error('Không thể bắt đầu cuộc gọi')
      }
    },
    [
      createCall,
      channel,
      channelMembers,
      user,
      setCurrentCall,
      setCallStatus,
      setShowCallUI,
      setParticipants,
      emitCallInvite,
      emitCallJoin,
    ]
  )

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            onClick={() => startCall('voice')}
            disabled={createCall.isPending}
          >
            <Phone className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Gọi thoại</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/20"
            onClick={() => startCall('video')}
            disabled={createCall.isPending}
          >
            <Video className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Video call</TooltipContent>
      </Tooltip>
    </div>
  )
}
