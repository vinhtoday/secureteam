'use client'

import { useAdminDashboard } from '@/hooks/use-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, MessageSquare, Radio, Hash, AlertCircle } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export function AdminDashboard() {
  const { data, isLoading, isError } = useAdminDashboard()

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <h2 className="text-2xl font-bold">Bảng điều khiển</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
          <p className="mt-2 text-muted-foreground">Không thể tải dữ liệu bảng điều khiển</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Tổng người dùng',
      value: data.totalUsers,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-100 dark:bg-violet-950/30',
    },
    {
      title: 'Đang trực tuyến',
      value: data.onlineUsers,
      icon: Radio,
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-100 dark:bg-indigo-950/30',
    },
    {
      title: 'Tin nhắn hôm nay',
      value: data.messagesToday,
      icon: MessageSquare,
      color: 'text-fuchsia-600 dark:text-fuchsia-400',
      bg: 'bg-fuchsia-100 dark:bg-fuchsia-950/30',
    },
    {
      title: 'Kênh hoạt động',
      value: data.activeChannels,
      icon: Hash,
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-100 dark:bg-pink-950/30',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">Bảng điều khiển</h2>
        <p className="text-sm text-muted-foreground">
          Tổng quan hệ thống SecureTeam
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-card border-none shadow-sm relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                {stat.title}
              </CardTitle>
              <div className={`rounded-xl p-2 ${stat.bg} transition-all duration-300 group-hover:scale-110`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="glass-card border-none shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tin nhắn 7 ngày qua</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-50" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                />
                <YAxis className="text-xs" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(var(--card), 0.8)',
                    backdropFilter: 'blur(10px)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.15)',
                  }}
                />
                <Bar
                  dataKey="messages"
                  fill="oklch(0.58 0.21 275)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card border-none shadow-sm overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-xl border border-border/40 p-3.5 hover:bg-muted/40 dark:hover:bg-muted/10 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-semibold dark:bg-violet-900/30 dark:text-violet-400 shadow-sm">
                    {activity.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      <span className="font-bold text-foreground">{activity.user.name}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                      {activity.target && (
                        <span className="font-medium text-foreground"> — {activity.target}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có hoạt động nào
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
