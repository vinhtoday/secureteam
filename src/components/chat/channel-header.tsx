'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Hash, Lock, Users, Search } from 'lucide-react'
import { CallControls } from '@/components/call/call-controls'
import type { Channel, ChannelDetail } from '@/hooks/use-channels'

interface ChannelHeaderProps {
  channel: Channel
  channelMembers?: ChannelDetail['members']
  onSearchMessages?: () => void
  onToggleMembers?: () => void
  onToggleSettings?: () => void
}

export function ChannelHeader({
  channel,
  channelMembers,
  onSearchMessages,
  onToggleMembers,
  onToggleSettings,
}: ChannelHeaderProps) {
  const typeIcon =
    channel.type === 'direct' ? (
      <Users className="h-4.5 w-4.5" />
    ) : channel.type === 'private' ? (
      <Lock className="h-4.5 w-4.5" />
    ) : (
      <Hash className="h-4.5 w-4.5" />
    )

  const typeLabel =
    channel.type === 'direct'
      ? 'Tin nhắn riêng'
      : channel.type === 'private'
        ? 'Nhóm kín'
        : 'Kênh công khai'

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-5">
      <span className="text-muted-foreground">{typeIcon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h2 className="truncate text-base font-bold">{channel.name}</h2>
          <Badge variant="outline" className="h-5 px-2 text-[11px] font-medium rounded-full shrink-0 border-muted-foreground/20 text-muted-foreground">
            {typeLabel}
          </Badge>
          {channel.memberCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {channel.memberCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <CallControls
          channel={{ id: channel.id, name: channel.name }}
          channelMembers={channelMembers}
          className="mr-1"
        />
        {onSearchMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={onSearchMessages}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tìm tin nhắn</TooltipContent>
          </Tooltip>
        )}
        {onToggleMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={onToggleMembers}>
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thành viên</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
