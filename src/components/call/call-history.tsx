'use client'

import { cn } from '@/lib/utils'
import { Phone, Video, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCallHistory } from '@/hooks/use-calls'

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CallHistory() {
  const { data, isLoading, error } = useCallHistory({ page: 1, limit: 20 })

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Lịch sử cuộc gọi</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Xem lại tất cả cuộc gọi đã tham gia
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/20">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Không thể tải lịch sử cuộc gọi</p>
            <Button variant="outline" size="sm" className="mt-2">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : !data?.data?.length ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Phone className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-muted-foreground">Chưa có cuộc gọi nào</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.data.map((call: Record<string, unknown>) => (
            <div
              key={call.id as string}
              className="flex items-center gap-4 rounded-xl border p-4 hover:bg-muted/30 transition-colors"
            >
              {/* Type icon */}
              <div className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full shrink-0',
                (call.type as string)?.includes('video')
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-950/30 dark:text-violet-400'
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
              )}>
                {(call.type as string)?.includes('video') ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {(call.title as string) || 'Cuộc gọi'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3 w-3" />
                  {formatTime(call.createdAt as string)}
                </p>
              </div>

              {/* Duration */}
              {call.duration ? (
                <span className="text-xs text-muted-foreground font-mono">
                  {formatDuration(call.duration as number)}
                </span>
              ) : null}

              {/* Status */}
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px]',
                  (call.status as string) === 'ended'
                    ? 'border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400'
                    : (call.status as string) === 'active'
                      ? 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400'
                      : 'border-muted text-muted-foreground'
                )}
              >
                {(call.status as string) === 'ended' ? (
                  <><CheckCircle className="h-3 w-3 mr-0.5" /> Hoàn thành</>
                ) : (call.status as string) === 'active' ? (
                  'Đang diễn ra'
                ) : (
                  'Bị hủy'
                )}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
