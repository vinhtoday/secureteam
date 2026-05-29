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

import { MessageSquare, Trello, Shield } from 'lucide-react'

type AuthView = 'login' | 'register'

const headerTabs = [
  { id: 'chat', label: 'Tin nhắn', icon: MessageSquare, adminOnly: false },
  { id: 'tasks', label: 'Kế hoạch', icon: Trello, adminOnly: false },
  { id: 'admin-dashboard', label: 'Quản trị', icon: Shield, adminOnly: true },
]

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

  const handleSelectChannel = useCallback((channelId: string | null) => {
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
      <div className="flex min-h-screen flex-col md:flex-row bg-[#0a0c0f]">
        {/* LEFT Panel - Branding and Features (Hidden on Mobile) */}
        <div className="relative hidden md:flex md:w-1/2 flex-col justify-between p-12 lg:p-20 bg-[#0a0c0f] border-r border-[#1e2a35] overflow-hidden">
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none" />
          
          {/* Top Hexagon Brand */}
          <div className="relative z-10 flex items-center gap-3">
            <div 
              className="flex h-12 w-12 items-center justify-center bg-[#00e5a0] text-black font-extrabold text-lg"
              style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
            >
              ST
            </div>
            <div className="font-title text-2xl font-bold tracking-[4px] uppercase text-white">
              SECURE<span className="text-[#00e5a0]">|TEAM</span>
            </div>
          </div>

          {/* Central Tagline & Features */}
          <div className="relative z-10 space-y-8 my-auto">
            <div className="space-y-3">
              <span className="font-mono text-xs text-[#00e5a0] tracking-wider block">
                // SYSTEM AUTHENTICATION PROTOCOL
              </span>
              <h2 className="font-title text-4xl lg:text-5xl font-extrabold uppercase text-white leading-tight">
                SECURE ACCESS <br />
                CONTROL GATEWAY
              </h2>
              <p className="text-muted-foreground text-sm font-sans max-w-md">
                Phân quyền truy cập đa cấp, mã hóa đầu cuối và nhật ký hoạt động quân sự cho toàn bộ giao tiếp doanh nghiệp.
              </p>
            </div>

            <ul className="font-mono text-xs text-[#00e5a0]/85 space-y-3.5 pl-1.5">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#00e5a0]" />
                <span>MÃ HÓA TIN NHẮN ĐẦU CUỐI [AES-256-GCM]</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#00e5a0]" />
                <span>KẾT NỐI CUỘC GỌI WebRTC TRỰC TIẾP P2P</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#00e5a0]" />
                <span>XÁC THỰC HAI YẾU TỐ BẮT BUỘC [2FA]</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#00e5a0]" />
                <span>NHẬT KÝ ĐỐI SOÁT HỆ THỐNG [AUDIT LOGS]</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-[#00e5a0]" />
                <span>PHÂN QUYỀN TRUY CẬP 4 VAI TRÒ [RBAC]</span>
              </li>
            </ul>
          </div>

          {/* Bottom security status tag */}
          <div className="relative z-10 flex items-center gap-2.5 font-mono text-[10px] text-muted-foreground/60 tracking-wider">
            <span className="h-2 w-2 rounded-full bg-[#00e5a0] animate-online-glow" />
            <span>CONNECTION SECURED • TLS 1.3 • MIL-SPEC</span>
          </div>
        </div>

        {/* RIGHT Panel - Auth Forms */}
        <div className="relative flex flex-1 items-center justify-center p-6 md:p-12 lg:p-20 bg-[#0a0c0f] overflow-hidden">
          {/* Background grid for mobile fallback */}
          <div className="absolute inset-0 bg-tactical-grid opacity-15 md:hidden pointer-events-none" />
          
          <div className="relative z-10 w-full max-w-md flex justify-center">
            {authView === 'login' ? (
              <LoginForm onSwitchToRegister={() => setAuthView('register')} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
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
        navItems={headerTabs}
        activeNavItem={['admin-dashboard', 'user-management', 'message-viewer', 'audit-logs'].includes(navItem) ? 'admin-dashboard' : navItem}
        onNavigate={(item) => handleNavigate(item as any)}
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
