'use client'

import { useAuthStore, type User } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  FileText,
  Search,
  LogOut,
  Shield,
} from 'lucide-react'

export type NavItem =
  | 'chat'
  | 'admin-dashboard'
  | 'user-management'
  | 'message-viewer'
  | 'audit-logs'

interface AppSidebarProps {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  className?: string
  collapsed?: boolean
}

interface NavItemConfig {
  id: NavItem
  label: string
  icon: React.ElementType
  roles: string[]
}

const navItems: NavItemConfig[] = [
  {
    id: 'chat',
    label: 'Tin nhắn',
    icon: MessageSquare,
    roles: ['SUPER_ADMIN', 'ADMIN', 'LEADER', 'MEMBER'],
  },
  {
    id: 'admin-dashboard',
    label: 'Bảng điều khiển',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'user-management',
    label: 'Quản lý người dùng',
    icon: Users,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'message-viewer',
    label: 'Xem tin nhắn',
    icon: Search,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'audit-logs',
    label: 'Nhật ký kiểm soát',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
]

export function AppSidebar({ activeItem, onNavigate, className, collapsed }: AppSidebarProps) {
  const user = useAuthStore((s) => s.user) as User | null
  const logout = useAuthStore((s) => s.logout)
  const userRole = user?.role?.name || 'MEMBER'

  const availableItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  )

  const handleLogout = async () => {
    await logout()
  }

  if (collapsed) {
    return (
      <aside className={cn('flex h-full w-14 flex-col items-center border-r bg-sidebar py-3', className)}>
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <ScrollArea className="flex-1 w-full px-1">
          <div className="flex flex-col items-center gap-1">
            {availableItems.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-10 w-10',
                  activeItem === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground'
                )}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </ScrollArea>
        <Separator className="my-2 w-8" />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          title="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </aside>
    )
  }

  return (
    <aside className={cn('hidden h-full w-60 flex-col border-r bg-sidebar lg:flex', className)}>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <span className="font-bold text-lg">SecureTeam</span>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {availableItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                'h-9 justify-start gap-2 px-3 font-normal',
                activeItem === item.id
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70'
              )}
              onClick={() => onNavigate(item.id)}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
