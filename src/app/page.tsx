'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { AppHeader } from '@/components/layout/app-header'
import { AppSidebar, type NavItem } from '@/components/layout/app-sidebar'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { ChatArea } from '@/components/chat/chat-area'
import { AdminDashboard } from '@/components/admin/admin-dashboard'
import { UserManagement } from '@/components/admin/user-management'
import { MessageViewer } from '@/components/admin/message-viewer'
import { AuditLogViewer } from '@/components/admin/audit-log-viewer'
import { useSocket } from '@/hooks/use-socket'
import { useChannel, type Channel } from '@/hooks/use-channels'
import { MessageSquarePlus } from 'lucide-react'

type AuthView = 'login' | 'register'

export default function Home() {
  const [authView, setAuthView] = useState<AuthView>('login')
  const [navItem, setNavItem] = useState<NavItem>('chat')
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false)
  const [appSidebarOpen, setAppSidebarOpen] = useState(false)

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const { onlineUsers } = useSocket()

  const isAdmin = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN'

  // Fetch the selected channel detail
  const { data: selectedChannel } = useChannel(
    navItem === 'chat' ? activeChannelId : null
  )

  const handleSelectChannel = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
    setChatSidebarOpen(false)
  }, [])

  const handleNavigate = useCallback((item: NavItem) => {
    setNavItem(item)
    setAppSidebarOpen(false)
  }, [])

  const handleToggleAppSidebar = useCallback(() => {
    setAppSidebarOpen((prev) => !prev)
  }, [])

  const handleToggleChatSidebar = useCallback(() => {
    setChatSidebarOpen((prev) => !prev)
  }, [])

  // Auth screens
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
        {authView === 'login' ? (
          <LoginForm onSwitchToRegister={() => setAuthView('register')} />
        ) : (
          <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop app sidebar */}
      <AppSidebar
        activeItem={navItem}
        onNavigate={handleNavigate}
        className="hidden lg:flex"
      />

      {/* Mobile app sidebar overlay */}
      {appSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAppSidebarOpen(false)}
          />
          <div className="relative z-50 h-full w-60">
            <AppSidebar
              activeItem={navItem}
              onNavigate={handleNavigate}
              className="flex"
            />
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          onToggleSidebar={
            navItem === 'chat' ? handleToggleChatSidebar : handleToggleAppSidebar
          }
        />

        <main className="flex flex-1 overflow-hidden">
          {navItem === 'chat' && (
            <>
              {/* Mobile chat sidebar overlay */}
              {chatSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                  <div
                    className="absolute inset-0 bg-black/50"
                    onClick={() => setChatSidebarOpen(false)}
                  />
                  <div className="relative z-50 h-full w-72">
                    <ChatSidebar
                      activeChannelId={activeChannelId}
                      onSelectChannel={handleSelectChannel}
                      className="flex"
                    />
                  </div>
                </div>
              )}

              {/* Chat sidebar - always visible on md+ */}
              <div className="hidden md:flex w-64 shrink-0">
                <ChatSidebar
                  activeChannelId={activeChannelId}
                  onSelectChannel={handleSelectChannel}
                  className="flex"
                />
              </div>

              {/* Chat area */}
              <ChatArea
                channel={selectedChannel ?? null}
                onlineUsers={onlineUsers}
                onToggleSidebar={handleToggleChatSidebar}
                isMobile={true}
              />
            </>
          )}

          {navItem === 'admin-dashboard' && isAdmin && (
            <div className="flex-1 overflow-y-auto">
              <AdminDashboard />
            </div>
          )}

          {navItem === 'user-management' && isAdmin && (
            <div className="flex-1 overflow-y-auto">
              <UserManagement />
            </div>
          )}

          {navItem === 'message-viewer' && isAdmin && (
            <div className="flex-1 overflow-y-auto">
              <MessageViewer />
            </div>
          )}

          {navItem === 'audit-logs' && isAdmin && (
            <div className="flex-1 overflow-y-auto">
              <AuditLogViewer />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
