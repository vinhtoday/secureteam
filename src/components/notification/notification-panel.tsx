'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/hooks/use-notifications'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Bell,
  Check,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  Phone,
  Settings,
  Inbox,
} from 'lucide-react'

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)
  const diffWeek = Math.floor(diffDay / 7)

  if (diffSec < 60) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHr < 24) return `${diffHr} giờ trước`
  if (diffDay < 7) return `${diffDay} ngày trước`
  if (diffWeek < 4) return `${diffWeek} tuần trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'task':
    case 'task_assigned':
    case 'task_status_changed':
    case 'task_comment':
      return { icon: ClipboardList, color: 'text-violet-500', bg: 'bg-violet-100 dark:bg-violet-900/30' }
    case 'message':
    case 'channel_message':
      return { icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' }
    case 'call':
    case 'call_incoming':
    case 'call_missed':
      return { icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' }
    case 'system':
    case 'announcement':
      return { icon: Settings, color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30' }
    default:
      return { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' }
  }
}

// ============================================
// Component
// ============================================

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const { data: response, isLoading } = useNotifications({ limit: 30 })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = response?.data?.notifications ?? []
  const unreadCount = response?.data?.unreadCount ?? 0

  const handleMarkRead = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation()
    markRead.mutate(notificationId)
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 rounded-lg transition-colors hover:bg-muted"
          aria-label="Thông báo"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[9px] font-bold text-white ring-2 ring-background animate-pulse-glow">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 rounded-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold">Thông báo</span>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 px-1.5 text-[10px] font-bold text-violet-700 dark:text-violet-400">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-[11px] text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              Đánh dấu đã đọc tất cả
            </Button>
          )}
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 rounded-xl p-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-12" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Không có thông báo</p>
              <p className="text-xs mt-0.5 opacity-60">Bạn sẽ nhận thông báo khi có cập nhật mới</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification: Notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

// ============================================
// Sub-component
// ============================================

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: Notification
  onMarkRead: (e: React.MouseEvent, id: string) => void
}) {
  const { icon: Icon, color, bg } = getNotificationIcon(notification.type)

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 transition-colors cursor-pointer',
        !notification.isRead
          ? 'bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-100/60 dark:hover:bg-violet-950/30'
          : 'hover:bg-muted/40',
      )}
    >
      {/* Unread dot */}
      <div className="flex items-start pt-1.5 shrink-0">
        {!notification.isRead && (
          <div className="h-2 w-2 rounded-full bg-violet-500 mt-1 animate-pulse" />
        )}
      </div>

      {/* Icon */}
      <div className={cn('flex h-9 w-9 items-center justify-center rounded-full shrink-0', bg)}>
        {notification.sender?.avatar ? (
          <Avatar className="h-9 w-9">
            <AvatarImage src={notification.sender.avatar} alt={notification.sender.name} />
            <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
              {getInitials(notification.sender.name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <Icon className={cn('h-4 w-4', color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold leading-tight truncate">
            {notification.sender?.name && (
              <span>{notification.sender.name} · </span>
            )}
            {notification.title}
          </p>
          <button
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
            onClick={(e) => onMarkRead(e, notification.id)}
            title="Đánh dấu đã đọc"
          >
            <Check className="h-3.5 w-3.5 text-muted-foreground hover:text-violet-500" />
          </button>
        </div>
        {notification.body && (
          <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/60">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  )
}
