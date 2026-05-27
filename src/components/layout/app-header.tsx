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
  Shield,
  Sun,
  Moon,
  Monitor,
  LogOut,
  User,
  Settings,
  Menu,
  PanelLeftClose,
  PanelLeft,
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
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-2.5">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg hover:bg-muted"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4.5 w-4.5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Shield className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <span className="hidden font-bold text-sm sm:inline-block tracking-tight">SecureTeam</span>
        </div>
      </div>

      {/* Center: Nav tabs - pill style */}
      {navItems && onNavigate && (
        <nav className="hidden md:flex items-center gap-1 mx-2 bg-muted/60 rounded-xl p-1">
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
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-background text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
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
      <div className="flex items-center gap-1.5">
        {/* Dark mode toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-muted" aria-label="Theme">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme('light')}>
              <Sun className="mr-2 h-4 w-4" /> Sáng
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')}>
              <Moon className="mr-2 h-4 w-4" /> Tối
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')}>
              <Monitor className="mr-2 h-4 w-4" /> Hệ thống
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 rounded-full pl-1 pr-3 hover:bg-muted">
              <Avatar className="h-7 w-7 ring-2 ring-background shadow-sm">
                <AvatarImage src={user?.avatar || undefined} alt={user?.name} />
                <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] dark:bg-violet-900/30 dark:text-violet-400">
                  {user?.name ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[100px] truncate text-xs font-medium md:inline-block">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {user?.role && (
                  <span className={cn(
                    'mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                    getRoleBadgeColor(user.role.name)
                  )}>
                    {getRoleLabel(user.role.name)}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Hồ sơ
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Cài đặt
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
