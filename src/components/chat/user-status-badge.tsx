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
  return (
    <span
      className={cn(
        'inline-block rounded-full ring-2 ring-background',
        statusColors[status] || statusColors.offline,
        sizeClasses[size],
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
      <Avatar className={avatarSizes[size]}>
        <AvatarImage src={avatar || undefined} alt={name} />
        <AvatarFallback className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {status && (
        <span className="absolute -bottom-0.5 -right-0.5">
          <UserStatusBadge status={status} size={size === 'lg' ? 'sm' : size === 'md' ? 'sm' : 'sm'} />
        </span>
      )}
    </div>
  )
}
