'use client'

import { useTheme } from 'next-themes'
import { useAuthStore, type User } from '@/stores/auth-store'
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
import {
  Shield,
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
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'ADMIN':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'LEADER':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getRoleLabel(role: string) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Quản trị tối cao'
    case 'ADMIN':
      return 'Quản trị viên'
    case 'LEADER':
      return 'Trưởng nhóm'
    default:
      return 'Thành viên'
  }
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { theme, setTheme } = useTheme()
  const user = useAuthStore((s) => s.user) as User | null
  const logout = useAuthStore((s) => s.logout)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-2">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggleSidebar}
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        )}
        <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        <span className="hidden font-bold text-lg sm:inline-block">SecureTeam</span>
      </div>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2">
        {/* Dark mode toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Chuyển giao diện">
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Chuyển giao diện</span>
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
            <Button variant="ghost" className="relative h-9 gap-2 rounded-full pl-2 pr-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatar || undefined} alt={user?.name} />
                <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs dark:bg-emerald-900/30 dark:text-emerald-400">
                  {user?.name ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[120px] truncate text-sm font-medium md:inline-block">
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
                  <span className={`mt-1 inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getRoleBadgeColor(user.role.name)}`}>
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
