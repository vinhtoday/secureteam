'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Shield, LogOut } from 'lucide-react'

type NavItem = 'chat' | 'admin-dashboard' | 'user-management' | 'message-viewer' | 'audit-logs'

const navItems: { id: NavItem; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'chat', label: 'Tin nhắn', icon: Shield, adminOnly: false },
  { id: 'admin-dashboard', label: 'Thống kê', icon: Shield, adminOnly: true },
  { id: 'user-management', label: 'Người dùng', icon: Shield, adminOnly: true },
  { id: 'message-viewer', label: 'Xem tin nhắn', icon: Shield, adminOnly: true },
  { id: 'audit-logs', label: 'Nhật ký', icon: Shield, adminOnly: true },
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
    <aside className="flex h-full w-60 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center gap-2.5 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <Shield className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="font-bold text-sm tracking-tight">SecureTeam</span>
      </div>
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-3">
          {availableItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                'h-9 justify-start gap-2.5 px-3 text-sm font-normal rounded-lg transition-colors',
                activeItem === item.id
                  ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive rounded-lg"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </aside>
  )
}
