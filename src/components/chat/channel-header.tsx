'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Hash, Lock, Users, Search, Settings, Edit3, Trash2, Loader2 } from 'lucide-react'
import { CallControls } from '@/components/call/call-controls'
import type { Channel, ChannelDetail } from '@/hooks/use-channels'
import { useAuthStore } from '@/stores/auth-store'
import { useUpdateChannel, useDeleteChannel } from '@/hooks/use-channels'

interface ChannelHeaderProps {
  channel: Channel
  channelMembers?: ChannelDetail['members']
  onSearchMessages?: () => void
  onToggleMembers?: () => void
  onToggleSettings?: () => void
  onSelectChannel?: (channelId: string | null) => void
}

export function ChannelHeader({
  channel,
  channelMembers,
  onSearchMessages,
  onToggleMembers,
  onToggleSettings,
  onSelectChannel,
}: ChannelHeaderProps) {
  const user = useAuthStore((s) => s.user)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description || '')

  const updateChannel = useUpdateChannel(channel.id)
  const deleteChannel = useDeleteChannel()

  const typeIcon =
    channel.type === 'direct' ? (
      <Users className="h-4.5 w-4.5" />
    ) : channel.type === 'private' ? (
      <Lock className="h-4.5 w-4.5" />
    ) : (
      <Hash className="h-4.5 w-4.5" />
    )

  const typeLabel =
    channel.type === 'direct'
      ? 'Tin nhắn riêng'
      : channel.type === 'private'
        ? 'Nhóm kín'
        : 'Kênh công khai'

  // Edit / delete allowed for channel owner, super admin, admin, or leader
  const isAuthorized =
    channel.type !== 'direct' &&
    (channel.ownerId === user?.id ||
      channel.owner?.id === user?.id ||
      user?.role?.name === 'SUPER_ADMIN' ||
      user?.role?.name === 'ADMIN' ||
      user?.role?.name === 'LEADER')

  const handleEditSave = () => {
    if (!name.trim()) return
    updateChannel.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowEditDialog(false)
        },
      }
    )
  }

  const handleDeleteChannel = () => {
    if (confirm(`Bạn có chắc chắn muốn xóa kênh "${channel.name}" không? Toàn bộ tin nhắn và dữ liệu trong kênh sẽ bị xóa vĩnh viễn.`)) {
      deleteChannel.mutate(channel.id, {
        onSuccess: () => {
          if (onSelectChannel) {
            onSelectChannel(null)
          }
        },
      })
    }
  }

  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background/85 backdrop-blur-sm px-5 shrink-0">
      <span className="text-muted-foreground">{typeIcon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <h2 className="truncate text-base font-bold">{channel.name}</h2>
          <Badge variant="outline" className="h-5 px-2 text-[11px] font-medium rounded-full shrink-0 border-muted-foreground/20 text-muted-foreground">
            {typeLabel}
          </Badge>
          {channel.memberCount > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {channel.memberCount}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <CallControls
          channel={{ id: channel.id, name: channel.name }}
          channelMembers={channelMembers}
          className="mr-1"
        />

        {onSearchMessages && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={onSearchMessages}>
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Tìm tin nhắn</TooltipContent>
          </Tooltip>
        )}

        {onToggleMembers && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={onToggleMembers}>
                <Users className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Thành viên & Tập tin</TooltipContent>
          </Tooltip>
        )}

        {isAuthorized && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" title="Cài đặt kênh">
                <Settings className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Cài đặt kênh</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                setName(channel.name)
                setDescription(channel.description || '')
                setShowEditDialog(true)
              }}>
                <Edit3 className="mr-2 h-4 w-4" />
                Chỉnh sửa kênh
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDeleteChannel} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa kênh
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Edit Channel Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Chỉnh sửa kênh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tên kênh</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên kênh..."
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mô tả</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả mục đích của kênh này..."
                className="min-h-[80px] rounded-xl resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="rounded-xl">
              Hủy bỏ
            </Button>
            <Button
              onClick={handleEditSave}
              className="rounded-xl bg-gradient-to-r from-violet-650 to-indigo-650 hover:from-violet-700 hover:to-indigo-700 text-white"
              disabled={!name.trim() || updateChannel.isPending}
            >
              {updateChannel.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Edit3 className="h-4 w-4 mr-1.5" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
