// SecureTeam - Shared Helper Functions

/**
 * Get initials from a name (e.g., "Nguyen Van A" -> "NV")
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Format a date string to a relative Vietnamese description
 */
export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHr < 24) return `${diffHr} giờ trước`
  if (diffDay === 1) return 'Hôm qua'
  if (diffDay < 7) return `${diffDay} ngày trước`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} tuần trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Check if a date is overdue (before end of today)
 */
export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date < today
}

/**
 * Priority labels in Vietnamese
 */
export const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

/**
 * Priority colors (Tailwind classes)
 */
export const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

/**
 * Priority config for TaskCard component
 */
export const PRIORITY_CONFIG: Record<string, { label: string; color: string; borderColor: string; bgClass: string }> = {
  urgent: { label: 'Khẩn cấp', color: 'text-red-700 dark:text-red-400', borderColor: 'border-l-red-500', bgClass: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: 'Cao', color: 'text-orange-700 dark:text-orange-400', borderColor: 'border-l-orange-500', bgClass: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'Trung bình', color: 'text-yellow-700 dark:text-yellow-400', borderColor: 'border-l-yellow-500', bgClass: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Thấp', color: 'text-green-700 dark:text-green-400', borderColor: 'border-l-green-500', bgClass: 'bg-green-100 dark:bg-green-900/30' },
}

/**
 * Status labels in Vietnamese
 */
export const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Xem xét',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

/**
 * Get avatar color gradient based on user ID
 */
const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
]

export function getAvatarColor(id: string): string {
  const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[index]
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: string): string {
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

/**
 * Get role display label
 */
export function getRoleLabel(role: string): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'ADMIN':
      return 'Admin'
    case 'LEADER':
      return 'Leader'
    default:
      return 'Member'
  }
}
