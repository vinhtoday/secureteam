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
  UserPlus,
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
      const otherMember = c.members?.find((m) => m.userId !== user?.id) as any
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
    <div className={cn('flex h-full w-72 flex-col bg-[#0f1318] border-r border-[#1e2a35]', className)}>
      {/* Top spacing and search bar */}
      <div className="px-3 pt-5 pb-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#00e5a0]/50" />
          <Input
            placeholder="MÃ HÓA TÌM KÊNH..."
            className="h-9 pl-9 text-xs font-mono rounded-none bg-[#0a0c0f] border-[#1e2a35] text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0] placeholder:text-muted-foreground/30"
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
            className="flex w-full items-center justify-center gap-2 rounded-none px-3 py-2 text-xs font-mono font-bold tracking-wider text-[#00e5a0] bg-[#00e5a0]/8 hover:bg-[#00e5a0]/15 border border-[#00e5a0]/20 transition-all cursor-pointer uppercase"
          >
            <UserPlus className="h-4 w-4" />
            TẠO LIÊN LẠC MỚI
          </button>
        </div>

        <Separator className="mx-3 w-auto bg-[#1e2a35]" />

        {/* Channels section */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 px-1 text-[9px] font-mono font-bold uppercase tracking-[2px] text-[#00e5a0]/50">
            KÊNH TRUYỀN TIN
          </span>
          <CreateChannelDialog
            trigger={
              <button className="text-[#00e5a0]/70 hover:text-[#00e5a0] transition-colors p-0.5 rounded-none border border-transparent hover:bg-[#1e2a35]/50" title="Tạo kênh mới">
                <Plus className="h-3.5 w-3.5" />
              </button>
            }
          />
        </div>

        <div className="pl-2 pr-3.5 space-y-0.5">
          {channelsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-none px-3 py-2.5">
                <Skeleton className="h-4 w-4 rounded-none bg-[#1e2a35]" />
                <Skeleton className="h-4 flex-1 rounded-none bg-[#1e2a35]" />
              </div>
            ))
          ) : groupChannels.length === 0 ? (
            <div className="px-3 py-4 text-center font-mono text-[10px] text-muted-foreground/60 uppercase">
              {search ? '// KHÔNG TÌM THẤY KÊNH' : '// CHƯA CÓ KÊNH TRUYỀN TIN'}
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

        <Separator className="mx-3 my-3 w-auto bg-[#1e2a35]" />

        {/* Direct Messages */}
        <div className="px-3 pb-1">
          <span className="flex items-center gap-1.5 px-1 text-[9px] font-mono font-bold uppercase tracking-[2px] text-[#00e5a0]/50">
            TIN NHẮN RIÊNG // DMs
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
              'flex w-full items-center gap-2.5 rounded-none px-3 py-2 text-left transition-all duration-150 border-l-[3px] cursor-pointer',
              activeChannelId === dmChannels?.find(c => c.members?.some(m => m.userId === 'securebot-system'))?.id
                ? 'border-l-[#00e5a0] bg-[#00e5a0]/8 text-white font-semibold'
                : 'border-l-transparent hover:bg-[#1e2a35]/40 text-muted-foreground'
            )}
          >
            <div 
              className="flex h-7 w-7 items-center justify-center bg-[#0a0c0f] text-[#00e5a0] border border-[#1e2a35] transition-transform hover:scale-105 duration-200"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-mono font-bold uppercase text-[#00e5a0]">SecureBot</span>
                <span className="rounded-none bg-[#00e5a0]/15 px-1 py-0.5 text-[8px] font-mono font-bold text-[#00e5a0] border border-[#00e5a0]/30">
                  AI
                </span>
              </div>
              <div className="truncate font-mono text-[9px] text-muted-foreground/60 mt-0.5 uppercase">
                Trợ lý chỉ huy AI
              </div>
            </div>
          </button>

          {/* Regular DMs */}
          {directChannels.length === 0 && (
            <div className="px-3 py-4 text-center font-mono text-[10px] text-muted-foreground/60 uppercase">
              // KHÔNG CÓ LIÊN LẠC RIÊNG
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

      <Separator className="bg-[#1e2a35]" />
      <div className="py-2.5 px-3 bg-[#0a0c0f]">
        <div className="text-[9px] font-mono text-center text-muted-foreground/35 select-none uppercase tracking-wider">
          SECURETEAM V2.0 // ACTIVE
        </div>
      </div>

      {/* New DM Sheet */}
      <Sheet open={showNewDM} onOpenChange={setShowNewDM}>
        <SheetContent className="bg-[#0f1318] border-l border-[#1e2a35] text-white">
          <SheetHeader className="pb-4 border-b border-[#1e2a35]">
            <SheetTitle className="text-lg font-title font-extrabold tracking-widest text-white uppercase">// NEW TRANSMISSION</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#00e5a0]/50" />
              <Input
                placeholder="TÌM KIẾM MẬT DANH..."
                className="pl-9 rounded-none border-[#1e2a35] bg-[#0a0c0f] font-mono text-xs text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0] placeholder:text-muted-foreground/30"
                value={dmSearch}
                onChange={(e) => setDmSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="max-h-[70vh] pr-1">
              <div className="space-y-1">
                {allUsers?.data
                  ?.filter((u) => u.id !== user?.id && !dmUserIds.has(u.id))
                  .map((u) => (
                    <button
                      key={u.id}
                      className="flex w-full items-center gap-3 rounded-none border border-transparent hover:border-[#1e2a35] px-3 py-2 bg-[#0a0c0f] hover:bg-[#1e2a35]/25 transition-all text-left"
                      onClick={() => handleCreateDM(u.id)}
                    >
                      <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono font-bold uppercase text-white truncate">{u.name}</div>
                        <div className="text-[10px] font-mono text-muted-foreground truncate">{u.email}</div>
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
      <Lock className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#00e5a0]" : "text-muted-foreground/60")} />
    ) : (
      <Hash className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#00e5a0]" : "text-muted-foreground/60")} />
    )

  return (
    <button
      className={cn(
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-all duration-150 border-l-[3px] cursor-pointer rounded-none',
        isActive
          ? 'border-l-[#00e5a0] bg-[#00e5a0]/8 text-white font-semibold'
          : 'border-l-transparent text-muted-foreground hover:bg-[#1e2a35]/40 hover:text-white'
      )}
      onClick={onClick}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <div className="truncate font-mono text-[11px] uppercase tracking-wider">{channel.name}</div>
        {channel.lastMessage && (
          <div className="truncate font-mono text-[9px] text-muted-foreground/60 mt-0.5">
            <span className="font-bold text-[#00e5a0]/70">{channel.lastMessage.sender.name.toUpperCase()}: </span>
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
        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-all duration-150 border-l-[3px] cursor-pointer rounded-none',
        isActive
          ? 'border-l-[#00e5a0] bg-[#00e5a0]/8 text-white font-semibold'
          : 'border-l-transparent text-muted-foreground hover:bg-[#1e2a35]/40 hover:text-white'
      )}
      onClick={onClick}
    >
      <div className="relative">
        <UserAvatar name={displayName} size="sm" />
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-none border border-[#0f1318] transition-all duration-300',
            isOnline ? 'bg-[#00e5a0] animate-online-glow' : 'bg-[#1e2a35]'
          )}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('truncate font-mono text-[11px] uppercase tracking-wider', isOnline ? 'text-white font-bold' : 'text-muted-foreground/80')}>{displayName}</div>
        {channel.lastMessage && (
          <div className="truncate font-mono text-[9px] text-muted-foreground/60 mt-0.5">
            {channel.lastMessage.content}
          </div>
        )}
      </div>
    </button>
  )
}

