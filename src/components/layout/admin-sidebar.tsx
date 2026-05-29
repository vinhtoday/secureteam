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
  LogOut,
  Trello
} from 'lucide-react'

type NavItem = 'chat' | 'tasks' | 'admin-dashboard' | 'user-management' | 'message-viewer' | 'audit-logs'

const navItems: { id: NavItem; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'chat', label: 'TIN NHẮN / CHAT', icon: MessageSquare, adminOnly: false },
  { id: 'tasks', label: 'KẾ HOẠCH / BOARD', icon: Trello, adminOnly: false },
  { id: 'admin-dashboard', label: 'THỐNG KÊ / STATS', icon: LayoutDashboard, adminOnly: true },
  { id: 'user-management', label: 'NGƯỜI DÙNG / AGENTS', icon: Users, adminOnly: true },
  { id: 'message-viewer', label: 'XEM TIN NHẮN / VIEWER', icon: Eye, adminOnly: true },
  { id: 'audit-logs', label: 'NHẬT KÝ / AUDIT LOGS', icon: ClipboardList, adminOnly: true },
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
    <aside className="flex h-full w-full flex-col bg-[#0f1318] border-r border-[#1e2a35]">
      <div className="px-4 pt-5 pb-2">
        <span className="text-[9px] font-mono font-bold uppercase tracking-[2px] text-[#00e5a0]/50 block px-2 mb-1">
          // SYSTEM CONTROL
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
                  'h-10 justify-start gap-3 px-3 text-[11px] font-mono font-bold tracking-wider rounded-none transition-all duration-150 cursor-pointer border-l-[3px]',
                  isActive
                    ? 'bg-[#00e5a0]/8 text-[#00e5a0] border-l-[#00e5a0]'
                    : 'text-muted-foreground hover:bg-[#1e2a35]/40 hover:text-white border-l-transparent'
                )}
                onClick={() => onNavigate(item.id)}
              >
                <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-[#00e5a0]' : 'text-muted-foreground')} />
                {item.label}
              </Button>
            )
          })}
        </nav>
      </ScrollArea>
      <Separator className="bg-[#1e2a35]" />
      <div className="p-3 flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2.5 text-[11px] font-mono font-bold rounded-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          TERMINATE SESSION
        </Button>
        <div className="text-[9px] font-mono text-center text-muted-foreground/35 select-none pt-1 uppercase tracking-wider">
          SECURETEAM V2.0 // DEPLOYED
        </div>
      </div>
    </aside>
  )
}

