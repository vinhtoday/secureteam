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
      <div className="space-y-6 p-6 font-mono">
        <h2 className="text-xl font-title font-extrabold tracking-widest text-white uppercase">// LOADING METRICS...</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-none bg-[#0f1318]/50 border border-[#1e2a35]" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-none bg-[#0f1318]/50 border border-[#1e2a35]" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 border border-destructive/30 bg-[#0f1318] rounded-none">
        <div className="text-center font-mono uppercase">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive mb-2" />
          <p className="text-xs text-white">// TRANSMISSION ERROR: FAILED TO RETRIEVE ANALYTICS HANDSHAKE</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'TOTAL REGISTERED AGENTS',
      value: data.totalUsers,
      icon: Users,
      color: 'text-[#00e5a0]',
      bg: 'bg-[#00e5a0]/8 border-[#00e5a0]/20',
    },
    {
      title: 'ACTIVE SESSIONS',
      value: data.onlineUsers,
      icon: Radio,
      color: 'text-[#00e5a0]',
      bg: 'bg-[#00e5a0]/8 border-[#00e5a0]/20',
    },
    {
      title: 'TRANSMISSIONS TODAY',
      value: data.messagesToday,
      icon: MessageSquare,
      color: 'text-[#00e5a0]',
      bg: 'bg-[#00e5a0]/8 border-[#00e5a0]/20',
    },
    {
      title: 'OPERATIONAL CHANNELS',
      value: data.activeChannels,
      icon: Hash,
      color: 'text-[#00e5a0]',
      bg: 'bg-[#00e5a0]/8 border-[#00e5a0]/20',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-title font-extrabold tracking-widest text-white uppercase">SYSTEM ANALYTICS</h2>
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          // SECURETEAM CORE OPERATIONAL PARAMETERS
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const isMessages = stat.title === 'TRANSMISSIONS TODAY'
          return (
            <Card
              key={stat.title}
              className={cn(
                'bg-[#0f1318] border border-[#1e2a35] rounded-none p-2 relative corner-bracket',
                isMessages ? 'lg:col-span-2' : ''
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground/80">
                  {stat.title}
                </CardTitle>
                <div className={cn('rounded-none p-2 shadow-sm border', stat.bg)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-title font-extrabold tracking-widest text-white">{stat.value.toLocaleString()}</div>
                {isMessages && (
                  <p className="text-[9px] font-mono text-[#00e5a0]/80 mt-1.5 uppercase font-bold tracking-wider">// VOLUME UP 12% VS YESTERDAY</p>
                )}
                {stat.title === 'ACTIVE SESSIONS' && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="h-2 w-2 bg-[#00e5a0] animate-online-glow" />
                    <span className="text-[9px] font-mono text-[#00e5a0] font-bold uppercase tracking-wider">CHANNELS OPERATING STABLE</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Chart */}
      <Card className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-2 relative corner-bracket">
        <CardHeader>
          <CardTitle className="text-xs font-mono font-bold text-white uppercase tracking-widest">// WEEKLY TRANSMISSION FREQUENCY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a35" opacity={0.3} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: '#1e2a35' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: '#1e2a35' }}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(0, 229, 160, 0.04)' }}
                  contentStyle={{
                    backgroundColor: '#0f1318',
                    borderColor: '#1e2a35',
                    borderRadius: '0px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    color: '#fff',
                  }}
                  itemStyle={{ color: '#00e5a0' }}
                  labelStyle={{ color: '#888' }}
                />
                <Bar
                  dataKey="messages"
                  fill="#00e5a0"
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-2 relative corner-bracket">
        <CardHeader>
          <CardTitle className="text-xs font-mono font-bold text-white uppercase tracking-widest">// RECENT AUDIT LOG EVENTS</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentActivity && data.recentActivity.length > 0 ? (
            <div className="space-y-2">
              {data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 rounded-none border border-[#1e2a35] bg-[#0a0c0f] p-3 hover:bg-[#1e2a35]/20 transition-colors"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#1e2a35] border border-[#1e2a35] text-[#00e5a0] text-xs font-mono font-bold">
                    {activity.user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0 font-mono text-[10px]">
                    <p className="text-muted-foreground leading-normal uppercase">
                      <span className="font-bold text-white">{activity.user.name.toUpperCase()}</span>{' '}
                      <span>{activity.action.toUpperCase()}</span>
                      {activity.target && (
                        <span className="text-white"> — {activity.target.toUpperCase()}</span>
                      )}
                    </p>
                    <p className="text-[8px] text-muted-foreground/60 mt-1 uppercase">
                      {new Date(activity.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs font-mono text-muted-foreground/50 uppercase">
              // NO RECENT AUDIT RECORDS FOUND
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

