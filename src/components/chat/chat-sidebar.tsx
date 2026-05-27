'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useChannels, type Channel } from '@/hooks/use-channels'
import { useAllUsers } from '@/hooks/use-auth'
import { useSocket } from '@/hooks/use-socket'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Hash,
  Lock,
  Plus,
  Search,
  MessageSquare,
  UserPlus,
  Shield,
} from 'lucide-react'
import { UserAvatar } from './user-status-badge'
import { CreateChannelDialog } from './create-channel-dialog'
import type { NavItem } from '@/components/layout/app-sidebar'

interface ChatSidebarProps {
  activeChannelId: string | null
  onSelectChannel: (channelId: string) => void
  className?: string
  onNavigate?: (item: NavItem) => void
}

export function ChatSidebar({
  activeChannelId,
  onSelectChannel,
  className,
}: ChatSidebarProps) {
  const [search, setSearch] = useState('')
  const [showNewDM, setShowNewDM] = useState(false)
  const [dmSearch, setDmSearch] = useState('')
  const user = useAuthStore((s) => s.user) as User | null
  const queryClient = useQueryClient()
  const { onlineUsers } = useSocket()

  const { data: channels, isLoading: channelsLoading } = useChannels(undefined, search || undefined)
  const { data: dmChannels } = useChannels('direct', undefined)
  const { data: allUsers } = useAllUsers({
    search: dmSearch || undefined,
    limit: 20,
  })

  const groupChannels = channels?.filter((c) => c.type !== 'direct') || []
  const directChannels = dmChannels || []

  const handleCreateDM = async (userId: string) => {
    try {
      const res = await api.post('/api/v1/channels/direct', { userId })
      const dmChannel = res.data as { id: string }
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      onSelectChannel(dmChannel.id)
      setShowNewDM(false)
    } catch {
      // Error handled silently
    }
  }

  // Get unique DM users
  const dmUserIds = new Set(directChannels.map((c) => {
    const otherMember = c.members?.find((m) => m.userId !== user?.id)
    return otherMember?.userId
  }).filter(Boolean))

  return (
    <div className={cn('flex h-full w-72 flex-col border-r bg-sidebar', className)}>
      {/* Header with gradient accent */}
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm leading-tight">SecureTeam</h3>
          </div>
        </div>
        <CreateChannelDialog
          trigger={
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" title="Tạo kênh mới" aria-label="Tạo kênh mới">
              <Plus className="h-4 w-4" />
            </Button>
          }
        />
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kênh..."
            className="h-9 pl-9 text-sm rounded-lg bg-muted/60 border-transparent focus:bg-background focus:border-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* New DM button */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setShowNewDM(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/15 hover:bg-emerald-100 dark:hover:bg-emerald-900/25 transition-colors shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Tin nhắn mới
          </button>
        </div>

        <Separator className="mx-3 w-auto" />

        {/* Channels section */}
        <div className="px-3 pt-3 pb-1">
          <span className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kênh
          </span>
        </div>

        <div className="px-2 space-y-0.5">
          {channelsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
              </div>
            ))
          ) : groupChannels.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {search ? 'Không tìm thấy kênh' : 'Chưa có kênh nào'}
            </div>
          ) : (
            groupChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={activeChannelId === channel.id}
                onClick={() => onSelectChannel(channel.id)}
              />
            ))
          )}
        </div>

        <Separator className="mx-3 my-3 w-auto" />

        {/* Direct Messages */}
        <div className="px-3 pb-1">
          <span className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tin nhắn riêng
          </span>
        </div>

        <div className="px-2 space-y-0.5 pb-4">
          {directChannels.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có tin nhắn riêng nào
            </div>
          ) : (
            directChannels.map((channel) => {
              const otherMember = channel.members?.find((m) => m.userId !== user?.id)
              const otherUserId = otherMember?.userId
              const isOnline = otherUserId ? onlineUsers.includes(otherUserId) : false

              return (
                <DMItem
                  key={channel.id}
                  channel={channel}
                  isActive={activeChannelId === channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  isOnline={isOnline}
                  currentUserId={user?.id || ''}
                />
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* New DM Sheet */}
      <Sheet open={showNewDM} onOpenChange={setShowNewDM}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Tin nhắn mới</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm người dùng..."
                className="pl-9 rounded-lg"
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-1">
                {allUsers?.data
                  ?.filter((u) => u.id !== user?.id && !dmUserIds.has(u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors"
                      onClick={() => handleCreateDM(u.id)}
                    >
                      <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <div className="text-left min-w-0">
                        <div className="text-sm font-medium truncate">{u.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

interface ChannelItemProps {
  channel: Channel
  isActive: boolean
  onClick: () => void
}

function ChannelItem({ channel, isActive, onClick }: ChannelItemProps) {
  const icon =
    channel.type === 'private' ? (
      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
    ) : (
      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
    )

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150',
        isActive
          ? 'border-l-2 border-primary bg-emerald-50/80 dark:bg-emerald-900/15 text-foreground font-medium shadow-sm'
          : 'border-l-2 border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm">{channel.name}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground mt-0.5">
            <span className="font-medium">{channel.lastMessage.sender.name}: </span>
            {channel.lastMessage.content}
          </div>
        )}
      </div>
    </button>
  )
}

interface DMItemProps {
  channel: Channel
  isActive: boolean
  onClick: () => void
  isOnline: boolean
  currentUserId: string
}

function DMItem({ channel, isActive, onClick, isOnline, currentUserId }: DMItemProps) {
  const otherMember = channel.members?.find((m) => m.userId !== currentUserId)
  const displayName = channel.name

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150',
        isActive
          ? 'border-l-2 border-primary bg-emerald-50/80 dark:bg-emerald-900/15 text-foreground font-medium shadow-sm'
          : 'border-l-2 border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <UserAvatar name={displayName} size="sm" />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar',
            isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-gray-400 dark:bg-gray-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('truncate text-sm', isOnline && 'font-medium')}>{displayName}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground mt-0.5">
            {channel.lastMessage.content}
          </div>
        )}
      </div>
    </button>
  )
}
