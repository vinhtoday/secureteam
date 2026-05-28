'use client'

import { useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { AppHeader } from '@/components/layout/app-header'
import { AdminSidebar, navItems, type NavItem } from '@/components/layout/admin-sidebar'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatArea } from '@/components/chat/chat-area'
import { CallManager } from '@/components/call/call-manager'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { UserManagement } from '@/components/admin/user-management'
import { MessageViewer } from '@/components/admin/message-viewer'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'
import { TaskBoard } from '@/components/task/task-board'
import { useSocket } from '@/hooks/use-socket'
import { useChannel } from '@/hooks/use-channels'
import { cn } from '@/lib/utils'

type AuthView = 'login' | 'register'

export default function Home() {
  const [authView, setAuthView] = useState<AuthView>('login')
  const [navItem, setNavItem] = useState<NavItem>('chat')
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
    // On mobile, close sidebar after selecting a channel
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }, [])

  const handleNavigate = useCallback((item: NavItem) => {
    setNavItem(item)
    // On mobile, close sidebar after navigating
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  // Auth screens
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-50/50 via-white to-indigo-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-violet-200/20 dark:bg-violet-900/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-200/20 dark:bg-indigo-900/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-100/10 dark:bg-violet-900/5 blur-3xl" />
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
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Call Manager — always rendered for incoming/active call UI */}
      <CallManager />

      {/* Global AppHeader - always full width on top */}
      <AppHeader
        onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        navItems={navItems}
        activeNavItem={navItem}
        onNavigate={handleNavigate}
        isAdmin={isAdmin}
      />

      {/* Main workspace area below the header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay (Drawer) */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative z-50 h-full w-80 animate-in slide-in-from-left duration-200">
              {isChatMode ? (
                <ChatSidebar
                  activeChannelId={activeChannelId}
                  onSelectChannel={handleSelectChannel}
                  className="flex"
                />
              ) : (
                <AdminSidebar
                  activeItem={navItem}
                  onNavigate={handleNavigate}
                  onLogout={handleLogout}
                  isAdmin={isAdmin}
                />
              )}
            </div>
          </div>
        )}

        {/* Desktop sidebar */}
        <div
          className={cn(
            'hidden md:flex shrink-0 flex-col border-r bg-sidebar transition-all duration-300 ease-in-out',
            sidebarOpen ? (isChatMode ? 'w-72' : 'w-60') : 'w-0 overflow-hidden border-r-0'
          )}
        >
          {isChatMode ? (
            <ChatSidebar
              activeChannelId={activeChannelId}
              onSelectChannel={handleSelectChannel}
              className="flex"
            />
          ) : (
            <AdminSidebar
              activeItem={navItem}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              isAdmin={isAdmin}
            />
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {isChatMode ? (
            <ChatArea
              channel={selectedChannel ?? null}
              onlineUsers={onlineUsers}
              onSelectChannel={handleSelectChannel}
            />
          ) : (
            <div className={cn("flex-1 p-4 lg:p-6", navItem !== 'tasks' ? "overflow-y-auto" : "overflow-hidden h-full flex flex-col")}>
              {navItem === 'tasks' && <TaskBoard />}
              {navItem === 'admin-dashboard' && isAdmin && <AdminDashboard />}
              {navItem === 'user-management' && isAdmin && <UserManagement />}
              {navItem === 'message-viewer' && isAdmin && <MessageViewer />}
              {navItem === 'audit-logs' && isAdmin && <AuditLogViewer />}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
