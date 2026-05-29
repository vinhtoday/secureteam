'use client'

import { useTheme } from 'next-themes'
import { useAuthStore, type User as AuthUser } from '@/stores/auth-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getInitials, getRoleBadgeColor, getRoleLabel } from '@/lib/helpers'
import {
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
  Settings,
  Menu,
} from 'lucide-react'

interface AppHeaderProps {
  onToggleSidebar?: () => void
  navItems?: { id: string; label: string; icon: React.ElementType; adminOnly: boolean }[]
  activeNavItem?: string
  onNavigate?: (item: string) => void
  isAdmin?: boolean
}

export function AppHeader({
  onToggleSidebar,
  navItems,
  activeNavItem,
  onNavigate,
  isAdmin,
}: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const user = useAuthStore((s) => s.user) as AuthUser | null
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 flex h-12 w-full items-center gap-3 border-b border-[#1e2d3d] bg-[#0d1117] px-6">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-[6px] border border-[#1e2d3d] bg-[#111820] hover:bg-[#161f2a] text-[#00d68f] transition-colors cursor-pointer"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>
        )}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div 
            className="flex h-7 w-7 items-center justify-center bg-[#00d68f] text-black font-extrabold text-xs transition-transform group-hover:scale-105 duration-200"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            ST
          </div>
          <span className="hidden font-rajdhani font-bold text-base tracking-wider sm:inline-block text-[#dce8f0] uppercase">
            SECURE<span className="text-[#00d68f]">|TEAM</span>
          </span>
        </div>
      </div>

      {/* Center: Nav tabs */}
      {navItems && onNavigate && (
        <nav className="hidden md:flex items-center gap-1.5 mx-4 bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-1">
          {navItems
            .filter((item) => !item.adminOnly || isAdmin)
            .map((item) => {
              const Icon = item.icon
              const isActive = activeNavItem === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[6px] px-3 py-1 text-[12px] font-rajdhani font-semibold tracking-wider transition-all duration-200 cursor-pointer uppercase border',
                    isActive
                      ? 'bg-[#00d68f]/14 text-[#00d68f] border-[#00d68f]/30'
                      : 'text-[#4d6b80] hover:text-[#dce8f0] border-transparent hover:bg-[#161f2a]'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              )
            })}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 rounded-[6px] border border-[#1e2d3d] bg-[#111820] hover:bg-[#161f2a] text-[#00d68f] cursor-pointer" 
              aria-label="Theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-1">
            <DropdownMenuItem onClick={() => setTheme('light')} className="text-xs font-mono-jb font-bold text-[#dce8f0] hover:bg-[#161f2a] rounded-[6px] cursor-pointer">
              <Sun className="mr-2 h-4 w-4 text-[#00d68f]" /> LIGHT PROTOCOL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="text-xs font-mono-jb font-bold text-[#dce8f0] hover:bg-[#161f2a] rounded-[6px] cursor-pointer">
              <Moon className="mr-2 h-4 w-4 text-[#00d68f]" /> DARK PROTOCOL
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="text-xs font-mono-jb font-bold text-[#dce8f0] hover:bg-[#161f2a] rounded-[6px] cursor-pointer">
              <Monitor className="mr-2 h-4 w-4 text-[#00d68f]" /> SYSTEM DEFAULT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 rounded-[6px] border border-[#1e2d3d] bg-[#111820] hover:bg-[#161f2a] pl-1 pr-3 cursor-pointer items-center">
              <Avatar className="h-6 w-6 rounded-full ring-1 ring-[#1e2d3d]">
                <AvatarImage className="rounded-full object-cover" src={user?.avatar || undefined} alt={user?.name} />
                <AvatarFallback className="rounded-full bg-[#1e2d3d] text-[#00d68f] text-[9px] font-mono-jb font-bold">
                  {user?.name ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[100px] truncate text-[12px] font-rajdhani font-semibold text-[#dce8f0] uppercase tracking-wider md:inline-block">
                {user?.name}
              </span>
              <span className="hidden md:inline-flex items-center rounded-[4px] bg-[#00d68f]/10 border border-[#00d68f]/20 px-1 py-0.5 text-[9px] font-mono-jb text-[#00d68f] tracking-tight">
                ONLINE
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#111820] border border-[#1e2d3d] rounded-[8px] p-1" align="end" forceMount>
            <DropdownMenuLabel className="font-normal px-2 py-1.5 border-b border-[#1e2d3d] mb-1">
              <div className="flex flex-col space-y-1">
                <p className="text-[12px] font-rajdhani font-bold text-[#dce8f0] uppercase tracking-wider">{user?.name}</p>
                <p className="text-[10px] font-mono-jb text-[#4d6b80]">{user?.email}</p>
                {user?.role && (
                  <span className={cn(
                    'mt-1 inline-flex w-fit items-center rounded-[4px] px-2 py-0.5 text-[9px] font-mono-jb font-bold uppercase border border-[#1e2d3d]',
                    user.role.name === 'admin' ? 'bg-destructive/15 text-destructive border-destructive/30' : 'bg-[#00d68f]/15 text-[#00d68f] border-[#00d68f]/30'
                  )}>
                    {getRoleLabel(user.role.name)}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuItem className="text-xs font-mono-jb font-bold text-[#dce8f0] hover:bg-[#161f2a] rounded-[6px] cursor-pointer">
              <User className="mr-2 h-4 w-4 text-[#00d68f]" />
              PROFILE SETTINGS
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs font-mono-jb font-bold text-[#dce8f0] hover:bg-[#161f2a] rounded-[6px] cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-[#00d68f]" />
              SYSTEM OPTIONS
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#1e2d3d]" />
            <DropdownMenuItem onClick={handleLogout} className="text-xs font-mono-jb font-bold text-[#d06363] hover:bg-destructive/10 rounded-[6px] cursor-pointer focus:bg-destructive/15 focus:text-[#d06363]">
              <LogOut className="mr-2 h-4 w-4" />
              TERMINATE SESSION
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

