'use client'

import { useState } from 'react'
import { useAdminMessages, useExportData } from '@/hooks/use-admin'
import { useChannels } from '@/hooks/use-channels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Search, Download, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { toast } from 'sonner'

export function MessageViewer() {
  const [search, setSearch] = useState('')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data: channelsData } = useChannels()
  const { data, isLoading, isError } = useAdminMessages({
    search: search || undefined,
    channelId: channelFilter !== 'all' ? channelFilter : undefined,
    page,
    limit: 20,
  })

  const exportData = useExportData()

  const messages = data?.data || []
  const meta = data?.meta
  const channels = channelsData || []

  const handleExport = async () => {
    try {
      const res = await exportData.mutateAsync({
        type: 'messages',
        filters: {
          search: search || undefined,
          channelId: channelFilter !== 'all' ? channelFilter : undefined,
        },
      })
      toast.success('Xuất dữ liệu thành công')
    } catch {
      toast.error('Xuất dữ liệu thất bại')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">Xem tin nhắn</h2>
          <p className="text-sm text-muted-foreground">Xem và tìm kiếm tất cả tin nhắn trong hệ thống</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-lg bg-muted/30 border-border/40 hover:bg-muted/50" onClick={handleExport} disabled={exportData.isPending}>
          <Download className="h-4 w-4" />
          Xuất dữ liệu
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm nội dung tin nhắn..."
            className="pl-9 bg-muted/30 focus:bg-background rounded-lg border-border/40"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48 rounded-lg bg-muted/30 border-border/40">
            <SelectValue placeholder="Tất cả kênh" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả kênh</SelectItem>
            {channels
              .filter((c) => c.type !== 'direct')
              .map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden glass-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người gửi</TableHead>
              <TableHead>Kênh</TableHead>
              <TableHead className="hidden md:table-cell">Nội dung</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <div className="flex flex-col items-center py-8">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="mt-2 text-sm text-muted-foreground">Không thể tải tin nhắn</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : messages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  Không tìm thấy tin nhắn
                </TableCell>
              </TableRow>
            ) : (
              messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium text-sm">{msg.sender.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{msg.channel.name}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {msg.content || '(tệp đính kèm)'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {meta.page} / {meta.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
