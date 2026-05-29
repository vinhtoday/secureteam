'use client'

import { useState, useMemo } from 'react'
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
  Bot,
} from 'lucide-react'
import { UserAvatar } from './user-status-badge'
import { CreateChannelDialog } from './create-channel-dialog'
interface ChatSidebarProps {
  activeChannelId: string | null
  onSelectChannel: (channelId: string) => void
  className?: string
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
  
  // Filter out securebot system channel from the dynamic DMs list to avoid duplicate bot display
  const directChannels = useMemo(() => {
    return (dmChannels || []).filter((c) => {
      const otherMember = c.members?.find((m) => m.userId !== user?.id)
      return otherMember?.userId !== 'securebot-system' && otherMember?.user?.isBot !== true
    })
  }, [dmChannels, user])

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
    <div className={cn('flex h-full w-72 flex-col bg-sidebar/30 backdrop-blur-md border-r border-ultra-thin', className)}>
      {/* Top spacing and search bar */}
      <div className="px-3 pt-5 pb-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Tìm kênh..."
            className="h-9 pl-9 text-sm rounded-lg bg-muted/30 hover:bg-muted/50 border border-ultra-thin focus:bg-background focus:border-violet-500/50 transition-colors"
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
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 border border-ultra-thin border-violet-500/20 transition-all shadow-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Tin nhắn mới
          </button>
        </div>

        <Separator className="mx-3 w-auto opacity-40" />

        {/* Channels section */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Kênh
          </span>
          <CreateChannelDialog
            trigger={
              <button className="text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors p-0.5 rounded-md hover:bg-muted/80" title="Tạo kênh mới">
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />
        </div>

        <div className="pl-2 pr-3.5 space-y-0.5">
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

        <Separator className="mx-3 my-3 w-auto opacity-40" />

        {/* Direct Messages */}
        <div className="px-3 pb-1">
          <span className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Tin nhắn riêng
          </span>
        </div>

        <div className="pl-2 pr-3.5 space-y-0.5">
          {/* SecureBot quick access */}
          <button
            onClick={async () => {
              try {
                const res = await api.post('/api/v1/channels/direct', { userId: 'securebot-system' })
                const dmChannel = res.data as { id: string }
                queryClient.invalidateQueries({ queryKey: ['channels'] })
                onSelectChannel(dmChannel.id)
              } catch {
                // Silently fail
              }
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 border-l-3 border-transparent rounded-l-none cursor-pointer',
              activeChannelId === dmChannels?.find(c => c.members?.some(m => m.userId === 'securebot-system'))?.id
                ? 'border-l-3 border-violet-600 dark:border-violet-400 bg-violet-500/10 text-foreground font-semibold shadow-sm'
                : 'hover:bg-violet-500/5 dark:hover:bg-violet-950/10 hover:border-violet-500/20'
            )}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm transition-transform hover:scale-105">
              <Bot className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-semibold text-violet-700 dark:text-violet-300">SecureBot</span>
                <span className="rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 py-0.5 text-[9px] font-bold text-violet-600 dark:text-violet-400 border border-ultra-thin border-violet-500/10">
                  AI
                </span>
              </div>
              <div className="truncate text-[11px] text-muted-foreground mt-0.5">
                Trợ lý AI thông minh
              </div>
            </div>
          </button>

          {/* Regular DMs */}
          {directChannels.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có tin nhắn riêng nào
            </div>
          )}
          {directChannels.length > 0 && directChannels.map((channel) => {
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
          })}
        </div>
      </ScrollArea>

      <Separator className="opacity-40" />
      <div className="py-2.5 px-3">
        <div className="text-[10px] text-center text-muted-foreground/40 font-medium select-none">
          SecureTeam v1.2 • By vinhtoday
        </div>
      </div>

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
      <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    ) : (
      <Hash className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    )

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 border-l-3 rounded-l-none cursor-pointer',
        isActive
          ? 'border-l-3 border-violet-600 dark:border-violet-400 bg-violet-500/10 text-foreground font-semibold shadow-sm'
          : 'border-l-3 border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm">{channel.name}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground/80 mt-0.5">
            <span className="font-semibold">{channel.lastMessage.sender.name}: </span>
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
  const displayName = channel.name

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-150 border-l-3 rounded-l-none cursor-pointer',
        isActive
          ? 'border-l-3 border-violet-600 dark:border-violet-400 bg-violet-500/10 text-foreground font-semibold shadow-sm'
          : 'border-l-3 border-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent/40 hover:text-sidebar-accent-foreground'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <UserAvatar name={displayName} size="sm" />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-sidebar transition-all duration-300',
            isOnline ? 'bg-emerald-500 animate-online-glow' : 'bg-gray-400 dark:bg-gray-600'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('truncate text-sm', isOnline && 'font-semibold')}>{displayName}</div>
        {channel.lastMessage && (
          <div className="truncate text-xs text-muted-foreground/80 mt-0.5">
            {channel.lastMessage.content}
          </div>
        )}
      </div>
    </button>
  )
}
