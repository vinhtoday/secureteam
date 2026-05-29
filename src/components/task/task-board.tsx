'use client'

import { useState, useMemo } from 'react'
import {
  useKanbanTasks,
  useUpdateTask,
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
    title: 'BACKLOG / TODO',
    color: 'border-t-muted-foreground/60',
    bgColor: 'bg-[#0f1318]',
    icon: HelpCircle,
    iconColor: 'text-muted-foreground/60',
    badgeBg: 'bg-[#0a0c0f] text-muted-foreground border border-[#1e2a35]',
  },
  {
    id: 'in_progress',
    title: 'IN PROGRESS',
    color: 'border-t-[#00e5a0]',
    bgColor: 'bg-[#0f1318]',
    icon: Clock,
    iconColor: 'text-[#00e5a0]',
    badgeBg: 'bg-[#0a0c0f] text-[#00e5a0] border border-[#1e2a35]',
  },
  {
    id: 'review',
    title: 'UNDER REVIEW',
    color: 'border-t-amber-500',
    bgColor: 'bg-[#0f1318]',
    icon: AlertCircle,
    iconColor: 'text-amber-500',
    badgeBg: 'bg-[#0a0c0f] text-amber-500 border border-[#1e2a35]',
  },
  {
    id: 'done',
    title: 'DONE / ARCHIVED',
    color: 'border-t-emerald-600',
    bgColor: 'bg-[#0f1318]',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
    badgeBg: 'bg-[#0a0c0f] text-emerald-500 border border-[#1e2a35]',
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
      <div className="flex flex-col gap-3 border border-[#1e2a35] bg-[#0f1318] p-4 md:flex-row md:items-center md:justify-between shadow-sm rounded-none">
        {/* Left: Search & Filter inputs */}
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative w-full max-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00e5a0]/50" />
            <Input
              placeholder="TÌM KIẾM CÔNG VIỆC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-9 pl-9 text-xs font-mono rounded-none border-[#1e2a35] bg-[#0a0c0f] text-white focus-visible:ring-[#00e5a0]/30 focus-visible:border-[#00e5a0] placeholder:text-muted-foreground/30"
            />
          </div>

          {/* Priority filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-[150px] rounded-none text-xs font-mono bg-[#0a0c0f] border-[#1e2a35] text-white cursor-pointer hover:bg-[#1e2a35]/40 transition-colors">
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-[#00e5a0]" />
              <SelectValue placeholder="Độ ưu tiên" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-1">
              <SelectItem value="all" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">TẤT CẢ ƯU TIÊN</SelectItem>
              <SelectItem value="urgent" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">🚨 KHẨN CẤP</SelectItem>
              <SelectItem value="high" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">🟠 CAO</SelectItem>
              <SelectItem value="medium" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">🟡 TRUNG BÌNH</SelectItem>
              <SelectItem value="low" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">🟢 THẤP</SelectItem>
            </SelectContent>
          </Select>

          {/* Assignee filter */}
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="h-9 w-[190px] rounded-none text-xs font-mono bg-[#0a0c0f] border-[#1e2a35] text-white cursor-pointer hover:bg-[#1e2a35]/40 transition-colors">
              <User className="mr-1.5 h-3.5 w-3.5 text-[#00e5a0]" />
              <SelectValue placeholder="Người thực hiện" />
            </SelectTrigger>
            <SelectContent className="bg-[#0f1318] border border-[#1e2a35] rounded-none p-1">
              <SelectItem value="all" className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">TẤT CẢ AGENTS</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs font-mono text-white hover:bg-[#1e2a35] rounded-none cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4.5 w-4.5 shrink-0 rounded-none border border-[#1e2a35]">
                      <AvatarImage className="rounded-none object-cover" src={u.avatar || undefined} alt={u.name} />
                      <AvatarFallback className="rounded-none text-[8px] font-mono font-bold bg-[#1e2a35] text-[#00e5a0]">
                        {getInitials(u.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="uppercase text-[10px]">{u.name}</span>
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
              className="h-9 gap-1.5 rounded-none text-xs font-mono hover:bg-[#1e2a35] text-muted-foreground hover:text-white uppercase cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              ĐẶT LẠI
            </Button>
          )}
        </div>

        {/* Right: New Task button */}
        {isAdmin && (
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-9 shrink-0 gap-1.5 rounded-none text-xs font-mono font-bold bg-[#00e5a0] text-black hover:bg-[#00c78b] active:scale-98 transition-all duration-150 uppercase cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            TẠO NHIỆM VỤ
          </Button>
        )}
      </div>

      {/* Kanban Board columns area */}
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-12">
          <div className="flex flex-col items-center gap-2 font-mono">
            <Loader2 className="h-8 w-8 animate-spin text-[#00e5a0]" />
            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">// RETRIEVING OPERATIONS GRID...</span>
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
                  'flex flex-col border border-[#1e2a35] h-[75vh] md:h-full p-4.5 transition-all duration-200 shadow-sm rounded-none',
                  col.bgColor,
                  isTarget && 'ring-1 ring-[#00e5a0] border-[#00e5a0] bg-[#00e5a0]/5 shadow-md'
                )}
              >
                {/* Column header */}
                <div className={cn('mb-3.5 flex items-center justify-between border-t-2 pt-2.5 px-1.5', col.color)}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-4.5 w-4.5', col.iconColor)} />
                    <h3 className="text-[11px] font-mono font-bold tracking-wider text-white">{col.title}</h3>
                  </div>
                  <span className={cn('rounded-none px-2 py-0.5 text-[9px] font-mono font-bold border shadow-sm', col.badgeBg)}>
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column body - scrollable cards list */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4 custom-scrollbar">
                  {columnTasks.length === 0 ? (
                    <div className="flex h-36 flex-col items-center justify-center border border-dashed border-[#1e2a35] bg-[#0a0c0f]/50 p-4 text-center hover:bg-[#00e5a0]/5 transition-all duration-150 rounded-none">
                      <p className="text-[10px] font-mono text-muted-foreground/55 uppercase font-bold">// NO ACTIVE DUTIES</p>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setShowCreateDialog(true)
                          }}
                          className="mt-2.5 text-[9px] font-mono font-bold text-[#00e5a0] hover:text-[#00c78b] transition-colors cursor-pointer uppercase"
                        >
                          + ADD TASK
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

