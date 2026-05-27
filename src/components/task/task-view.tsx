'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTaskStore, type TaskFilters } from '@/stores/task-store'
import { useTasks, type Task } from '@/hooks/use-tasks'
import { useTaskLabels } from '@/hooks/use-tasks'
import { KanbanBoard } from './kanban-board'
import { TaskDetailPanel } from './task-detail-panel'
import { CreateTaskDialog } from './create-task-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutGrid,
  List,
  ListTodo,
  Plus,
  Search,
  Filter,
  CalendarDays,
  MessageSquare,
  ChevronDown,
  X,
  SlidersHorizontal,
  Circle,
  CircleDot,
  ClipboardCheck,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Hôm qua'
  if (diffDays < 7) return `${diffDays} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date < today
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Xem xét',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  todo: Circle,
  in_progress: CircleDot,
  review: ClipboardCheck,
  done: CheckCircle2,
  cancelled: RotateCcw,
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-green-500',
}

const PRIORITY_BADGE: Record<string, { bg: string; color: string }> = {
  urgent: { bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-700 dark:text-red-400' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-700 dark:text-orange-400' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', color: 'text-yellow-700 dark:text-yellow-400' },
  low: { bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-700 dark:text-green-400' },
}

// ============================================
// Component
// ============================================

export function TaskView() {
  const viewMode = useTaskStore((s) => s.viewMode)
  const setViewMode = useTaskStore((s) => s.setViewMode)
  const filters = useTaskStore((s) => s.filters)
  const setFilters = useTaskStore((s) => s.setFilters)
  const resetFilters = useTaskStore((s) => s.resetFilters)
  const setShowCreateDialog = useTaskStore((s) => s.setShowCreateDialog)

  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  const { data: tasksResponse, isLoading } = useTasks({
    ...filters,
    search: filters.search || undefined,
  })
  const { data: labelsData } = useTaskLabels()
  const labels = labelsData ?? []

  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data])

  const hasActiveFilters = filters.status || filters.priority || filters.assigneeId || filters.labelId || filters.search

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    setFilters({ search: value || undefined })
  }

  return (
    <div className="flex h-full">
      {/* Filter Sidebar - Desktop */}
      <div className={cn(
        'hidden lg:flex w-56 shrink-0 flex-col border-r border-border/50 bg-sidebar transition-all duration-200',
        filterSidebarOpen ? 'w-56' : 'w-0 overflow-hidden border-r-0',
      )}>
        <FilterSidebar filters={filters} setFilters={setFilters} resetFilters={resetFilters} labels={labels} />
      </div>

      {/* Filter Sidebar - Mobile */}
      {filterSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setFilterSidebarOpen(false)} />
          <div className="relative z-50 h-full w-64 animate-slide-in-right">
            <FilterSidebar
              filters={filters}
              setFilters={setFilters}
              resetFilters={resetFilters}
              labels={labels}
              onClose={() => setFilterSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-xl">
          {/* Filter toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-8 w-8 rounded-lg',
                  hasActiveFilters && 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30',
                )}
                onClick={() => setFilterSidebarOpen(!filterSidebarOpen)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bộ lọc</TooltipContent>
          </Tooltip>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="hidden md:flex items-center gap-1.5 animate-fade-in-up">
              {filters.status && (
                <Badge variant="secondary" className="h-6 gap-1 rounded-lg text-[10px] border-0">
                  {STATUS_LABELS[filters.status]}
                  <button onClick={() => setFilters({ status: null })}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              )}
              {filters.priority && (
                <Badge variant="secondary" className="h-6 gap-1 rounded-lg text-[10px] border-0">
                  {PRIORITY_LABELS[filters.priority]}
                  <button onClick={() => setFilters({ priority: null })}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              )}
              {filters.search && (
                <Badge variant="secondary" className="h-6 gap-1 rounded-lg text-[10px] border-0">
                  &quot;{filters.search}&quot;
                  <button onClick={() => { setSearchInput(''); setFilters({ search: undefined }) }}><X className="h-2.5 w-2.5" /></button>
                </Badge>
              )}
              <button
                onClick={() => { resetFilters(); setSearchInput('') }}
                className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline ml-1"
              >
                Xóa tất cả
              </button>
            </div>
          )}

          <div className="flex-1" />

          {/* Search */}
          <div className="relative hidden sm:block w-48 lg:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm công việc..."
              className="h-8 pl-8 text-xs rounded-xl border-border/50 bg-muted/40 focus-visible:ring-violet-500/20"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-0.5 bg-muted/60 rounded-xl p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2.5 rounded-lg text-xs',
                viewMode === 'kanban' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" />
              <span className="hidden md:inline">Kanban</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 px-2.5 rounded-lg text-xs',
                viewMode === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-3.5 w-3.5 mr-1" />
              <span className="hidden md:inline">Danh sách</span>
            </Button>
          </div>

          {/* Create Task */}
          <Button
            className="h-8 gap-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-violet-500/25"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Tạo mới</span>
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'kanban' ? (
            <KanbanBoard filters={{ ...filters, search: filters.search || undefined }} />
          ) : (
            <ListView tasks={tasks} isLoading={isLoading} />
          )}
        </div>
      </div>

      {/* Panels */}
      <TaskDetailPanel />
      <CreateTaskDialog />
    </div>
  )
}

// ============================================
// List View
// ============================================

function ListView({ tasks, isLoading }: { tasks: Task[]; isLoading: boolean }) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-2">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <ListTodo className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Không có công việc</p>
            <p className="text-xs mt-0.5 opacity-60">Tạo công việc mới để bắt đầu</p>
          </div>
        ) : (
          tasks.map((task, index) => (
            <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 20}ms` }}>
              <ListTaskItem task={task} />
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )
}

function ListTaskItem({ task }: { task: Task }) {
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId)
  const setShowTaskDetail = useTaskStore((s) => s.setShowTaskDetail)

  const StatusIcon = STATUS_ICONS[task.status] || Circle
  const priorityConfig = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'done' && task.status !== 'cancelled'

  const handleClick = () => {
    setSelectedTaskId(task.id)
    setShowTaskDetail(true)
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-4 rounded-xl border border-border/40 bg-card p-3.5 cursor-pointer shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-primary/20 hover:-translate-y-px',
        `border-l-[3px] ${PRIORITY_COLORS[task.priority] || 'border-l-gray-400'}`,
      )}
    >
      {/* Status icon */}
      <div className="shrink-0">
        <StatusIcon className={cn(
          'h-5 w-5',
          task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : task.status === 'review' ? 'text-amber-500' : 'text-muted-foreground/40',
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className="text-sm font-semibold truncate">{task.title}</h4>
          <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold shrink-0', priorityConfig.bg, priorityConfig.color)}>
            {PRIORITY_LABELS[task.priority] || task.priority}
          </span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          {/* Labels */}
          {task.labels.slice(0, 2).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center h-4 rounded-md px-1.5 text-[9px] font-medium"
              style={{ backgroundColor: `${label.color}15`, color: label.color }}
            >
              {label.name}
            </span>
          ))}
          <span className="text-[11px]">{STATUS_LABELS[task.status] || task.status}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
        {/* Assignees */}
        <div className="flex items-center -space-x-1.5">
          {task.assignments.slice(0, 2).map((a) => (
            <Avatar key={a.id} className="h-6 w-6 ring-2 ring-card">
              <AvatarImage src={a.user.avatar || undefined} alt={a.user.name} />
              <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                {getInitials(a.user.name)}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assignments.length > 2 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[9px] font-semibold ring-2 ring-card">
              +{task.assignments.length - 2}
            </div>
          )}
        </div>

        {/* Due date */}
        {task.dueDate && (
          <span className={cn('text-[11px] flex items-center gap-1', overdue && 'text-red-500 font-medium')}>
            <CalendarDays className="h-3 w-3" />
            {formatRelativeDate(task.dueDate)}
          </span>
        )}

        {/* Comment count */}
        {task._count.comments > 0 && (
          <span className="text-[11px] flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {task._count.comments}
          </span>
        )}

        {/* Progress */}
        {task.progress > 0 && task.progress < 100 && (
          <div className="w-12 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${task.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Filter Sidebar
// ============================================

interface FilterSidebarProps {
  filters: TaskFilters
  setFilters: (filters: Partial<TaskFilters>) => void
  resetFilters: () => void
  labels: { id: string; name: string; color: string }[]
  onClose?: () => void
}

function FilterSidebar({ filters, setFilters, resetFilters, labels, onClose }: FilterSidebarProps) {
  return (
    <aside className="flex h-full w-56 flex-col border-r border-border/50 bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between h-13 px-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold">Bộ lọc</span>
        </div>
        <div className="flex items-center gap-1">
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-5">
        {/* Status Filter */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Trạng thái
          </label>
          <div className="space-y-1">
            {Object.entries(STATUS_LABELS).map(([value, label]) => {
              const Icon = STATUS_ICONS[value]
              return (
                <button
                  key={value}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                    filters.status === value
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  onClick={() => setFilters({ status: filters.status === value ? null : value })}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <Separator />

        {/* Priority Filter */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Ưu tiên
          </label>
          <div className="space-y-1">
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <button
                key={value}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                  filters.priority === value
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                onClick={() => setFilters({ priority: filters.priority === value ? null : value })}
              >
                <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[value].replace('border-l-', 'bg-'))} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Label Filter */}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
            Nhãn
          </label>
          <div className="space-y-1">
            {labels.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 py-2">Chưa có nhãn</p>
            ) : (
              labels.map((label) => (
                <button
                  key={label.id}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors',
                    filters.labelId === label.id
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                  onClick={() => setFilters({ labelId: filters.labelId === label.id ? null : label.id })}
                >
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: label.color }} />
                  {label.name}
                </button>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Reset */}
      <div className="border-t border-border/50 p-3">
        <Button
          variant="ghost"
          className="w-full h-8 text-xs text-muted-foreground hover:text-destructive rounded-xl"
          onClick={() => { resetFilters(); onClose?.() }}
        >
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Đặt lại bộ lọc
        </Button>
      </div>
    </aside>
  )
}


