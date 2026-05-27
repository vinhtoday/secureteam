'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Eye,
  ClipboardList,
  LogOut
} from 'lucide-react'

type NavItem = 'chat' | 'admin-dashboard' | 'user-management' | 'message-viewer' | 'audit-logs'

const navItems: { id: NavItem; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'chat', label: 'Tin nhắn', icon: MessageSquare, adminOnly: false },
  { id: 'admin-dashboard', label: 'Thống kê', icon: LayoutDashboard, adminOnly: true },
  { id: 'user-management', label: 'Người dùng', icon: Users, adminOnly: true },
  { id: 'message-viewer', label: 'Xem tin nhắn', icon: Eye, adminOnly: true },
  { id: 'audit-logs', label: 'Nhật ký hệ thống', icon: ClipboardList, adminOnly: true },
]

export type { NavItem }
export { navItems }

interface AdminSidebarProps {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  onLogout: () => void
  isAdmin: boolean
}

export function AdminSidebar({
  activeItem,
  onNavigate,
  onLogout,
  isAdmin,
}: AdminSidebarProps) {
  const availableItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  )

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar/50 backdrop-blur-md border-r border-border/40">
      <div className="px-4 pt-5 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 block px-2 mb-1">
          Quản trị hệ thống
        </span>
      </div>
      <ScrollArea className="flex-1 py-1">
        <nav className="flex flex-col gap-1 px-3">
          {availableItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={cn(
                  'h-10 justify-start gap-3 px-3 text-sm font-medium rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400 border-l-2 border-violet-600 dark:border-violet-400 rounded-l-none'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className={cn('h-4.5 w-4.5 shrink-0 transition-colors', isActive ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground')} />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </ScrollArea>
      <Separator className="opacity-50" />
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
