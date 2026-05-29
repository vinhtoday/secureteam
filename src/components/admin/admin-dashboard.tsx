'use client'

import { useAdminDashboard } from '@/hooks/use-admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, MessageSquare, Radio, Hash, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const isMessages = stat.title === 'Tin nhắn hôm nay'
          return (
            <Card
              key={stat.title}
              className={cn(
                'glass-card-premium border border-ultra-thin shadow-md relative group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 rounded-3xl p-2',
                isMessages ? 'lg:col-span-2' : ''
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                  {stat.title}
                </CardTitle>
                <div className={cn('rounded-2xl p-2.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-ultra-thin', stat.bg)}>
                  <stat.icon className={cn('h-4.5 w-4.5', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight">{stat.value.toLocaleString()}</div>
                {isMessages && (
                  <p className="text-xs text-muted-foreground/75 mt-1.5 font-semibold">Tần suất trao đổi tăng 12% so với hôm qua</p>
                )}
                {stat.title === 'Đang trực tuyến' && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-online-glow" />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">Kết nối hoạt động ổn định</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart */}
      <Card className="glass-card-premium border border-ultra-thin shadow-md overflow-hidden rounded-3xl p-2">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground/90">Tin nhắn 7 ngày qua</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData || []}>
                <defs>
                  <linearGradient id="messagesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.22 275)" stopOpacity={1} />
                    <stop offset="100%" stopColor="oklch(0.68 0.19 275)" stopOpacity={0.25} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" vertical={false} />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 15, 20, 0.85)',
                    backdropFilter: 'blur(12px)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    borderRadius: '16px',
                    fontSize: '12px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
                    color: '#fff',
                  }}
                />
                <Bar
                  dataKey="messages"
                  fill="url(#messagesGrad)"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card-premium border border-ultra-thin shadow-md overflow-hidden rounded-3xl p-2">
        <CardHeader>
          <CardTitle className="text-base font-bold text-foreground/90">Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-2xl border border-ultra-thin p-3.5 hover:bg-muted/40 dark:hover:bg-muted/10 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold shadow-sm">
                    {activity.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      <span className="font-bold text-foreground">{activity.user.name}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>
                      {activity.target && (
                        <span className="font-semibold text-foreground"> — {activity.target}</span>
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground font-semibold">
              Chưa có hoạt động nào
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
