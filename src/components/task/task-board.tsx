'use client'

import { useState, useMemo } from 'react'
import {
  useKanbanTasks,
  useUpdateTask,
  useTaskLabels,
  type Task
} from '@/hooks/use-tasks'
import { useTaskStore } from '@/stores/task-store'
import { useAuthStore } from '@/stores/auth-store'
import { useAllUsers } from '@/hooks/use-auth'
import { TaskCard } from './task-card'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskDetailPanel } from './task-detail-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/helpers'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  Clock,
  HelpCircle,
  AlertCircle,
  Loader2,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Kanban column config
const COLUMNS_CONFIG = [
  {
    id: 'todo',
    title: 'Cần làm',
    color: 'border-t-slate-400 dark:border-t-slate-600',
    bgColor: 'bg-slate-500/5',
    icon: HelpCircle,
    iconColor: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  },
  {
    id: 'in_progress',
    title: 'Đang làm',
    color: 'border-t-indigo-500 dark:border-t-indigo-600',
    bgColor: 'bg-indigo-500/5',
    icon: Clock,
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    badgeBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    id: 'review',
    title: 'Xem xét',
    color: 'border-t-amber-500 dark:border-t-amber-600',
    bgColor: 'bg-amber-500/5',
    icon: AlertCircle,
    iconColor: 'text-amber-500 dark:text-amber-400',
    badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    id: 'done',
    title: 'Hoàn thành',
    color: 'border-t-emerald-500 dark:border-t-emerald-600',
    bgColor: 'bg-emerald-500/5',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    badgeBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
]

export function TaskBoard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)

  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN' || user?.role?.name === 'LEADER'

  const setShowCreateDialog = useTaskStore((s) => s.setShowCreateDialog)

  // Fetch users for filters
  const { data: usersRes } = useAllUsers({ limit: 50 })
  const users = usersRes?.data ?? []

  // Create filters object for query
  const queryFilters = useMemo(() => {
    const f: any = {}
    if (priorityFilter !== 'all') f.priority = priorityFilter
    if (assigneeFilter !== 'all') f.assigneeId = assigneeFilter
    if (searchTerm.trim()) f.search = searchTerm.trim()
    return f
  }, [priorityFilter, assigneeFilter, searchTerm])

  const { data: columnsData, isLoading, refetch } = useKanbanTasks(queryFilters)
  const updateTask = useUpdateTask()

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    if (draggedOverColumn !== columnId) {
      setDraggedOverColumn(columnId)
    }
  }

  const handleDragLeave = () => {
    setDraggedOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    setDraggedOverColumn(null)
    const taskId = e.dataTransfer.getData('taskId')
    const sourceStatus = e.dataTransfer.getData('taskStatus')

    if (taskId && sourceStatus !== targetStatus) {
      updateTask.mutate({ id: taskId, status: targetStatus })
    }
  }

  const handleResetFilters = () => {
    setSearchTerm('')
    setPriorityFilter('all')
    setAssigneeFilter('all')
  }

  // Pre-load components to prevent layout shift
  const boardColumns = useMemo(() => {
    if (!columnsData) return []
    return columnsData
  }, [columnsData])

  return (
    <div className="flex h-full flex-col space-y-4">
      {/* Top action bar: filters, search, and new task */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card/45 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        {/* Left: Search & Filter inputs */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full max-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Tìm kiếm công việc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-sm rounded-xl focus-visible:ring-violet-500/30"
            />
          </div>

          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-[130px] rounded-xl text-xs">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <SelectValue placeholder="Độ ưu tiên" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tất cả độ ưu tiên</SelectItem>
              <SelectItem value="urgent" className="text-xs">🚨 Khẩn cấp</SelectItem>
              <SelectItem value="high" className="text-xs">🟠 Cao</SelectItem>
              <SelectItem value="medium" className="text-xs">🟡 Trung bình</SelectItem>
              <SelectItem value="low" className="text-xs">🟢 Thấp</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee filter */}
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-[170px] rounded-xl text-xs">
              <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
              <SelectValue placeholder="Người thực hiện" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Tất cả người thực hiện</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4.5 w-4.5 shrink-0">
                      <AvatarImage src={u.avatar || undefined} alt={u.name} />
                      <AvatarFallback className="text-[7px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{u.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset Filters button */}
          {(searchTerm || priorityFilter !== 'all' || assigneeFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 gap-1.5 rounded-xl text-xs hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Đặt lại
            </Button>
          )}
        </div>

        {/* Right: New Task button */}
        {isAdmin && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-9 shrink-0 gap-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-violet-500/20"
          >
            <Plus className="h-4 w-4" />
            Tạo công việc
          </Button>
        )}
      </div>

      {/* Kanban Board columns area */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            <span className="text-sm text-muted-foreground font-medium">Đang tải bảng công việc...</span>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto pb-4 md:grid-cols-4 md:overflow-y-hidden">
          {COLUMNS_CONFIG.map((col) => {
            const colData = boardColumns.find((c) => c.status === col.id)
            const columnTasks = colData?.tasks ?? []
            const isTarget = draggedOverColumn === col.id
            const Icon = col.icon

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  'flex flex-col rounded-2xl border border-border/40 bg-card/35 backdrop-blur-[2px] h-[75vh] md:h-full p-3 transition-all duration-200',
                  col.bgColor,
                  isTarget && 'ring-2 ring-violet-500/40 border-violet-500/30 bg-violet-500/5'
                )}
              >
                {/* Column header */}
                <div className={cn('mb-3 flex items-center justify-between border-t-2 pt-2.5 px-1.5', col.color)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4.5 w-4.5', col.iconColor)} />
                    <h3 className="text-sm font-bold tracking-tight text-foreground/90">{col.title}</h3>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', col.badgeBg)}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column body - scrollable cards list */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 custom-scrollbar">
                  {columnTasks.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-4 text-center">
                      <p className="text-xs text-muted-foreground/60 font-medium">Chưa có công việc</p>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            // Set status defaults when creating from empty column
                            setShowCreateDialog(true)
                          }}
                          className="mt-2 text-[10px] font-bold text-violet-500 hover:text-violet-600 transition-colors"
                        >
                          + Thêm mới
                        </button>
                      )}
                    </div>
                  ) : (
                    columnTasks.map((task: Task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Global Dialogs and Drawers for Tasks */}
      <CreateTaskDialog />
      <TaskDetailPanel />
    </div>
  )
}
