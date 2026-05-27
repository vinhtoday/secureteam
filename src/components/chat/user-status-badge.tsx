'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserStatusBadgeProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusColors: Record<string, string> = {
  online: 'bg-emerald-500',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-gray-400 dark:bg-gray-600',
}

const statusShadowColors: Record<string, string> = {
  online: 'shadow-emerald-500/50',
  away: 'shadow-amber-500/50',
  busy: 'shadow-red-500/50',
  offline: '',
}

const sizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
}

export const UserStatusBadge = React.memo(function UserStatusBadge({
  status,
  size = 'md',
  className,
}: UserStatusBadgeProps) {
  const isOnline = status === 'online'
  return (
    <span
      className={cn(
        'inline-block rounded-full ring-2 ring-background',
        statusColors[status] || statusColors.offline,
        sizeClasses[size],
        isOnline && 'shadow-sm',
        statusShadowColors[status],
        className
      )}
      title={
        status === 'online'
          ? 'Trực tuyến'
          : status === 'away'
            ? 'Vắng mặt'
            : status === 'busy'
              ? 'Bận'
              : 'Ngoại tuyến'
      }
    />
  )
})

interface UserAvatarProps {
  name: string
  avatar?: string | null
  status?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const avatarSizes = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
}

const statusPosition = {
  sm: 'absolute -bottom-0.5 -right-0.5',
  md: 'absolute -bottom-0.5 -right-0.5',
  lg: 'absolute -bottom-0.5 -right-0.5',
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function UserAvatar({
  name,
  avatar,
  status,
  size = 'md',
  className,
}: UserAvatarProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <Avatar className={cn(avatarSizes[size], 'ring-2 ring-background')}>
        <AvatarImage src={avatar || undefined} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-400">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span className={statusPosition[size]}>
          <UserStatusBadge status={status} size={size === 'lg' ? 'sm' : 'sm'} />
        </span>
      )}
    </div>
  )
}
