'use client'

import { useState } from 'react'
import { useChannels, useCreateChannel } from '@/hooks/use-channels'
import { useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Hash, Lock, Users, Trash2, Plus, Loader2 } from 'lucide-react'
import { CreateChannelDialog } from '@/components/chat/create-channel-dialog'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function ChannelManagement() {
  const [deletingChannel, setDeletingChannel] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data: channels, isLoading } = useChannels()
  const createChannel = useCreateChannel()

  const handleDelete = async () => {
    if (!deletingChannel) return
    try {
      await fetch(`/api/v1/channels/${deletingChannel}`, {
        method: 'DELETE',
      })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      setDeletingChannel(null)
    } catch {
      // Silent
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'public':
        return (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Hash className="h-3 w-3" /> Công khai
          </Badge>
        )
      case 'private':
        return (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock className="h-3 w-3" /> Kín
          </Badge>
        )
      case 'direct':
        return (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Users className="h-3 w-3" /> Riêng
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quản lý kênh</h2>
          <p className="text-sm text-muted-foreground">Tạo và quản lý kênh trò chuyện</p>
        </div>
        <CreateChannelDialog onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['channels'] })
        }} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên kênh</TableHead>
              <TableHead>Loại</TableHead>
              <TableHead>Thành viên</TableHead>
              <TableHead className="hidden md:table-cell">Tin nhắn</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : !channels || channels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Chưa có kênh nào
                </TableCell>
              </TableRow>
            ) : (
              channels.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell className="font-medium">{ch.name}</TableCell>
                  <TableCell>{getTypeBadge(ch.type)}</TableCell>
                  <TableCell>{ch.memberCount}</TableCell>
                  <TableCell className="hidden md:table-cell">{ch.messageCount}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {format(new Date(ch.createdAt), 'dd/MM/yyyy', { locale: vi })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingChannel(ch.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deletingChannel} onOpenChange={() => setDeletingChannel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa kênh</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa kênh này? Tất cả tin nhắn sẽ bị mất vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
