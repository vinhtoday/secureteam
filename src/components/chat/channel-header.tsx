'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Hash, Lock, Users, Search } from 'lucide-react'
import type { Channel } from '@/hooks/use-channels'

interface ChannelHeaderProps {
  channel: Channel
  onSearchMessages?: () => void
  onToggleMembers?: () => void
  onToggleSettings?: () => void
}

export function ChannelHeader({
  channel,
  onSearchMessages,
  onToggleMembers,
  onToggleSettings,
}: ChannelHeaderProps) {
  const typeIcon =
    channel.type === 'direct' ? (
      <Users className="h-4 w-4" />
    ) : channel.type === 'private' ? (
      <Lock className="h-4 w-4" />
    ) : (
      <Hash className="h-4 w-4" />
    )

  const typeLabel =
    channel.type === 'direct'
      ? 'Tin nhắn riêng'
      : channel.type === 'private'
        ? 'Nhóm kín'
        : 'Kênh công khai'

  return (
    <div className="flex h-12 items-center gap-2 border-b bg-background px-4">
      <span className="text-muted-foreground">{typeIcon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-semibold text-sm">{channel.name}</h2>
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal shrink-0">
            {typeLabel}
          </Badge>
          {channel.memberCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {channel.memberCount} thành viên
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-0.5">
        {onSearchMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchMessages}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tìm tin nhắn</TooltipContent>
          </Tooltip>
        )}
        {onToggleMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleMembers}>
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
