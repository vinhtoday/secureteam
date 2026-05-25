'use client'

import { useState } from 'react'
import { useAuditLogs } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
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
import { AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

export function AuditLogViewer() {
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, isError } = useAuditLogs({
    action: actionFilter !== 'all' ? actionFilter : undefined,
    page,
    limit: 20,
  })

  const logs = data?.data || []
  const meta = data?.meta

  const actionTypes = [
    'all',
    'USER_CREATE',
    'USER_UPDATE',
    'USER_DELETE',
    'USER_LOGIN',
    'USER_LOGOUT',
    'CHANNEL_CREATE',
    'CHANNEL_DELETE',
    'PASSWORD_CHANGE',
  ]

  const getActionBadge = (action: string) => {
    if (action.startsWith('USER')) {
      return <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">{action}</Badge>
    }
    if (action.startsWith('CHANNEL')) {
      return <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">{action}</Badge>
    }
    return <Badge variant="outline" className="text-[10px]">{action}</Badge>
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold">Nhật ký kiểm soát</h2>
        <p className="text-sm text-muted-foreground">Theo dõi mọi hoạt động trong hệ thống</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Loại hoạt động" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả hoạt động</SelectItem>
            {actionTypes.filter(a => a !== 'all').map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Người thực hiện</TableHead>
              <TableHead>Hoạt động</TableHead>
              <TableHead className="hidden md:table-cell">Mục tiêu</TableHead>
              <TableHead className="hidden lg:table-cell">IP</TableHead>
              <TableHead>Thời gian</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="flex flex-col items-center py-8">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="mt-2 text-sm text-muted-foreground">Không thể tải nhật ký</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Chưa có nhật ký nào
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium text-sm">{log.user.name}</TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                    {log.target || '—'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {log.ipAddress || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })}
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
