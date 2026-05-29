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
  online: 'bg-[#00d68f]',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-[#1e2d3d]',
}

const statusShadowColors: Record<string, string> = {
  online: 'shadow-[#00d68f]/50 shadow-sm',
  away: 'shadow-amber-500/50 shadow-sm',
  busy: 'shadow-red-500/50 shadow-sm',
  offline: '',
}

const sizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
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
        'inline-block rounded-full border border-[#0d1117]',
        statusColors[status] || statusColors.offline,
        sizeClasses[size],
        isOnline && 'animate-online-glow',
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
  sm: 'h-8 w-8 text-[11px]',
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
      <Avatar className={cn(avatarSizes[size], 'rounded-full border border-[#1e2d3d] bg-[#111820]')}>
        <AvatarImage className="rounded-full object-cover" src={avatar || undefined} alt={name} />
        <AvatarFallback className="rounded-full bg-[#1e2d3d] text-[#00d68f] font-mono-jb font-bold">
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

