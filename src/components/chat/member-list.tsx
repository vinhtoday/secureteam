'use client'

import { cn } from '@/lib/utils'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useChannel } from '@/hooks/use-channels'
import { useRemoveChannelMember } from '@/hooks/use-channels'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { X, Crown, Shield, MessageSquarePlus } from 'lucide-react'
import { UserAvatar } from './user-status-badge'
import { useOnlineUsers } from '@/hooks/use-online-users'

interface MemberListProps {
  channelId: string | null
  open: boolean
  onClose: () => void
}

export function MemberList({ channelId, open, onClose }: MemberListProps) {
  if (!open || !channelId) return null

  return (
    <div className="flex h-full w-64 flex-col border-l bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <h3 className="font-semibold text-sm">Thành viên</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Đóng danh sách thành viên">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <MemberListContent channelId={channelId} />
    </div>
  )
}

function MemberListContent({ channelId }: { channelId: string }) {
  const user = useAuthStore((s) => s.user) as User | null
  const { data: channel, isLoading } = useChannel(channelId)
  const { data: onlineUsersData } = useOnlineUsers()
  const removeMember = useRemoveChannelMember(channelId)

  const onlineUserIds = new Set(onlineUsersData?.map((u) => u.id) || [])
  const members = channel?.members || []
  const isAdmin = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN'

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  const admins = members.filter((m) => m.role === 'admin')
  const regularMembers = members.filter((m) => m.role !== 'admin')

  const handleRemoveMember = (userId: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này khỏi kênh?')) {
      removeMember.mutate(userId)
    }
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-4">
        {/* Admins */}
        {admins.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <Crown className="h-3 w-3 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground">
                Quản trị viên — {admins.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {admins.map((member) => (
                <MemberItem
                  key={member.userId}
                  member={member}
                  isOnline={onlineUserIds.has(member.userId)}
                  isCurrentUser={member.userId === user?.id}
                  isAdmin={isAdmin}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular members */}
        {regularMembers.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground">
                Thành viên — {regularMembers.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {regularMembers.map((member) => (
                <MemberItem
                  key={member.userId}
                  member={member}
                  isOnline={onlineUserIds.has(member.userId)}
                  isCurrentUser={member.userId === user?.id}
                  isAdmin={isAdmin}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="flex flex-col items-center py-8 text-center">
            <MessageSquarePlus className="h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">
              Chưa có thành viên nào
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

interface MemberItemProps {
  member: {
    userId: string
    role: string
    user?: {
      id: string
      name: string
      email: string
      avatar?: string | null
    }
  }
  isOnline: boolean
  isCurrentUser: boolean
  isAdmin: boolean
  onRemove: (userId: string) => void
}

function MemberItem({ member, isOnline, isCurrentUser, isAdmin, onRemove }: MemberItemProps) {
  const name = member.user?.name || 'Người dùng'
  const email = member.user?.email

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors group',
      )}
    >
      <UserAvatar
        name={name}
        avatar={member.user?.avatar}
        status={isOnline ? 'online' : 'offline'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">
            {name}
            {isCurrentUser && (
              <span className="text-muted-foreground font-normal"> (bạn)</span>
            )}
          </span>
          {member.role === 'admin' && (
            <Shield className="h-3 w-3 text-amber-500 shrink-0" />
          )}
        </div>
        {email && (
          <div className="truncate text-[11px] text-muted-foreground">{email}</div>
        )}
      </div>
      {isAdmin && !isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
          onClick={() => onRemove(member.userId)}
          aria-label="Xóa thành viên"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}
