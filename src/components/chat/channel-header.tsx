'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Hash, Lock, Users, Search, Settings, Menu } from 'lucide-react'
import type { Channel } from '@/hooks/use-channels'

interface ChannelHeaderProps {
  channel: Channel
  onSearchMessages?: () => void
  onToggleMembers?: () => void
  onToggleSettings?: () => void
  onToggleSidebar?: () => void
  isMobile?: boolean
}

export function ChannelHeader({
  channel,
  onSearchMessages,
  onToggleMembers,
  onToggleSettings,
  onToggleSidebar,
  isMobile,
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
    <div className="flex h-14 items-center gap-2 border-b bg-background px-4">
      {isMobile && onToggleSidebar && (
        <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={onToggleSidebar} aria-label="Mở danh sách kênh">
          <Menu className="h-4 w-4" />
        </Button>
      )}

      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-muted-foreground">{typeIcon}</span>
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-sm">
            {channel.name}
          </h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
              {typeLabel}
            </Badge>
            {channel.memberCount > 0 && (
              <span>{channel.memberCount} thành viên</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {onSearchMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchMessages} aria-label="Tìm tin nhắn">
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tìm tin nhắn</TooltipContent>
          </Tooltip>
        )}
        {onToggleMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleMembers} aria-label="Danh sách thành viên">
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Danh sách thành viên</TooltipContent>
          </Tooltip>
        )}
        {onToggleSettings && (channel.type !== 'direct') && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleSettings} aria-label="Cài đặt kênh">
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cài đặt kênh</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
