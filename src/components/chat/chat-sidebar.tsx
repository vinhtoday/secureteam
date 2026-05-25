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
      const dmChannel = res.data
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
    <div className={cn('flex h-full flex-col border-r bg-sidebar', className)}>
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        <h3 className="font-semibold text-sm">SecureTeam</h3>
        <div className="flex gap-1">
          <CreateChannelDialog
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Tạo kênh mới" aria-label="Tạo kênh mới">
                <Plus className="h-4 w-4" />
              </Button>
            }
          />
        </div>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kênh..."
            className="h-8 pl-8 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* New DM button */}
        <div className="px-2 pb-2">
          <button
            onClick={() => setShowNewDM(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tin nhắn mới
          </button>
        </div>

        <Separator className="mx-2 w-auto" />

        {/* Channels section */}
        <div className="px-2 pt-2 pb-1">
          <span className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Kênh
          </span>
        </div>

        <div className="px-2 space-y-0.5">
          {channelsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-md px-2 py-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))
          ) : groupChannels.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
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

        <Separator className="mx-2 my-2 w-auto" />

        {/* Direct Messages */}
        <div className="px-2 pb-1">
          <span className="flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tin nhắn riêng
          </span>
        </div>

        <div className="px-2 space-y-0.5">
          {directChannels.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
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
              <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm người dùng..."
                className="pl-9"
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
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 hover:bg-muted transition-colors"
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
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-medium">{channel.name}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground">
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
  const displayName = otherMember?.user?.name || channel.name

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-sidebar',
            isOnline ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm">{displayName}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground">
            {channel.lastMessage.content}
          </div>
        )}
      </div>
    </button>
  )
}
