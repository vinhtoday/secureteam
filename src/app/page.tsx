'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { AppHeader } from '@/components/layout/app-header'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatArea } from '@/components/chat/chat-area'
import { CallManager } from '@/components/call/call-manager'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { UserManagement } from '@/components/admin/user-management'
import { MessageViewer } from '@/components/admin/message-viewer'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'
import { useSocket } from '@/hooks/use-socket'
import { useChannel } from '@/hooks/use-channels'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  Search,
  FileText,
  LogOut,
  Shield,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type AuthView = 'login' | 'register'
type NavItem = 'chat' | 'admin-dashboard' | 'user-management' | 'message-viewer' | 'audit-logs'

const navItems: { id: NavItem; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { id: 'chat', label: 'Tin nhắn', icon: MessageSquare, adminOnly: false },
  { id: 'admin-dashboard', label: 'Thống kê', icon: LayoutDashboard, adminOnly: true },
  { id: 'user-management', label: 'Người dùng', icon: Users, adminOnly: true },
  { id: 'message-viewer', label: 'Xem tin nhắn', icon: Search, adminOnly: true },
  { id: 'audit-logs', label: 'Nhật ký', icon: FileText, adminOnly: true },
]

export default function Home() {
  const [authView, setAuthView] = useState<AuthView>('login')
  const [navItem, setNavItem] = useState<NavItem>('chat')
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true)
  const [adminNavOpen, setAdminNavOpen] = useState(false)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { onlineUsers } = useSocket()

  const isAdmin = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN' || user?.role?.name === 'LEADER'
  const isChatMode = navItem === 'chat'

  const { data: selectedChannel } = useChannel(
    isChatMode ? activeChannelId : null
  )

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    setChatSidebarOpen(false)
  }, [])

  const handleNavigate = useCallback((item: NavItem) => {
    setNavItem(item)
    setAdminNavOpen(false)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  // Auth screens
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-200/30 dark:bg-emerald-800/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-teal-200/30 dark:bg-teal-800/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-100/20 dark:bg-emerald-900/5 blur-3xl" />
        </div>
        <div className="relative z-10">
          {authView === 'login' ? (
            <LoginForm onSwitchToRegister={() => setAuthView('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Call Manager — always rendered for incoming/active call UI */}
      <CallManager />

      {/* ===== CHAT MODE: ChatSidebar + ChatArea ===== */}
      {isChatMode && (
        <>
          {/* Mobile sidebar overlay */}
          {chatSidebarOpen && (
            <div className="fixed inset-0 z-40 md:hidden">
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                onClick={() => setChatSidebarOpen(false)}
              />
              <div className="relative z-50 h-full w-80 animate-in slide-in-from-left duration-200">
                <ChatSidebar
                  activeChannelId={activeChannelId}
                  onSelectChannel={handleSelectChannel}
                  className="flex"
                />
              </div>
            </div>
          )}

          {/* Desktop chat sidebar */}
          <div className={cn(
            'hidden md:flex shrink-0 flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
            chatSidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-r-0'
          )}>
            <ChatSidebar
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              className="flex"
            />
          </div>

          {/* Chat main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <AppHeader
              onToggleSidebar={() => setChatSidebarOpen((prev) => !prev)}
              navItems={navItems}
              activeNavItem={navItem}
              onNavigate={handleNavigate}
              isAdmin={isAdmin}
            />
            <ChatArea
              channel={selectedChannel ?? null}
              onlineUsers={onlineUsers}
            />
          </div>
        </>
      )}

      {/* ===== ADMIN MODE: Navigation + Content ===== */}
      {!isChatMode && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            onToggleSidebar={() => setAdminNavOpen((prev) => !prev)}
            navItems={navItems}
            activeNavItem={navItem}
            onNavigate={handleNavigate}
            isAdmin={isAdmin}
          />

          <div className="flex flex-1 overflow-hidden">
            {/* Admin navigation sidebar */}
            {adminNavOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <div
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                  onClick={() => setAdminNavOpen(false)}
                />
                <div className="relative z-50 h-full w-72 animate-in slide-in-from-left duration-200">
                  <AdminSidebar
                    activeItem={navItem}
                    onNavigate={(item) => { handleNavigate(item); setAdminNavOpen(false) }}
                    onLogout={handleLogout}
                    isAdmin={isAdmin}
                  />
                </div>
              </div>
            )}

            {/* Desktop admin sidebar */}
            <div className="hidden lg:flex w-60 shrink-0">
              <AdminSidebar
                activeItem={navItem}
                onNavigate={handleNavigate}
                onLogout={handleLogout}
                isAdmin={isAdmin}
              />
            </div>

            {/* Admin content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6">
              {navItem === 'admin-dashboard' && isAdmin && <AdminDashboard />}
              {navItem === 'user-management' && isAdmin && <UserManagement />}
              {navItem === 'message-viewer' && isAdmin && <MessageViewer />}
              {navItem === 'audit-logs' && isAdmin && <AuditLogViewer />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ===== Admin Sidebar Component ===== */
function AdminSidebar({
  activeItem,
  onNavigate,
  onLogout,
  isAdmin,
}: {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  onLogout: () => void
  isAdmin: boolean
}) {
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
