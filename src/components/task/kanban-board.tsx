'use client'

import { useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useTasks, useUpdateTask, type Task } from '@/hooks/use-tasks'
import { useTaskStore, type TaskFilters } from '@/stores/task-store'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, CircleDot, Circle, ClipboardCheck, CheckCircle2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// ============================================
// Column Config
// ============================================

interface ColumnConfig {
  id: string
  label: string
  icon: React.ElementType
  headerColor: string
  headerBg: string
  dotColor: string
}

const COLUMNS: ColumnConfig[] = [
  { id: 'todo', label: 'Cần làm', icon: Circle, headerColor: 'text-slate-500', headerBg: 'bg-slate-100 dark:bg-slate-800/50', dotColor: 'bg-slate-400' },
  { id: 'in_progress', label: 'Đang làm', icon: CircleDot, headerColor: 'text-blue-500', headerBg: 'bg-blue-100 dark:bg-blue-900/30', dotColor: 'bg-blue-500' },
  { id: 'review', label: 'Xem xét', icon: ClipboardCheck, headerColor: 'text-amber-500', headerBg: 'bg-amber-100 dark:bg-amber-900/30', dotColor: 'bg-amber-500' },
  { id: 'done', label: 'Hoàn thành', icon: CheckCircle2, headerColor: 'text-emerald-500', headerBg: 'bg-emerald-100 dark:bg-emerald-900/30', dotColor: 'bg-emerald-500' },
]

// ============================================
// Component
// ============================================

interface KanbanBoardProps {
  filters?: TaskFilters
}

export function KanbanBoard({ filters }: KanbanBoardProps) {
  const { data: tasksResponse, isLoading } = useTasks(filters)
  const updateTask = useUpdateTask()
  const setShowCreateDialog = useTaskStore((s) => s.setShowCreateDialog)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const tasks = useMemo(() => tasksResponse?.data ?? [], [tasksResponse?.data])

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = { todo: [], in_progress: [], review: [], done: [] }
    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task)
      }
    }
    // Sort by position
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.position - b.position)
    }
    return grouped
  }, [tasks])

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    setDragOverColumn(null)
    const taskId = e.dataTransfer.getData('taskId')
    const oldStatus = e.dataTransfer.getData('taskStatus')
    if (taskId && oldStatus && oldStatus !== newStatus) {
      updateTask.mutate({ id: taskId, status: newStatus })
    }
  }, [updateTask])

  return (
    <div className="flex h-full gap-4 overflow-x-auto p-1">
      {COLUMNS.map((column) => {
        const Icon = column.icon
        const columnTasks = tasksByStatus[column.id] ?? []
        const isDragOver = dragOverColumn === column.id

        return (
          <div
            key={column.id}
            className={cn(
              'flex w-72 min-w-[280px] flex-shrink-0 flex-col rounded-2xl border border-border/40 bg-muted/30 transition-all duration-200',
              isDragOver && 'border-primary/40 bg-primary/5 ring-2 ring-primary/10',
            )}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className={cn('flex items-center justify-between rounded-t-2xl px-4 py-3', column.headerBg)}>
              <div className="flex items-center gap-2.5">
                <div className={cn('h-2.5 w-2.5 rounded-full', column.dotColor)} />
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/60 dark:bg-black/20 px-1.5 text-[10px] font-bold text-muted-foreground">
                  {columnTasks.length}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/40 dark:hover:bg-black/20">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => {}}>
                    Lọc công việc
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}>
                    Sắp xếp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Tasks */}
            <ScrollArea className="flex-1 px-2.5 py-2">
              <div className="flex flex-col gap-2.5 min-h-[60px]">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))
                ) : columnTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/50">
                    <Icon className="h-8 w-8 mb-2 opacity-30" />
                    <span className="text-xs">Không có công việc</span>
                  </div>
                ) : (
                  columnTasks.map((task, index) => (
                    <div key={task.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 30}ms` }}>
                      <TaskCard task={task} />
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Add Task Button (only for Cần làm) */}
            {column.id === 'todo' && (
              <div className="border-t border-border/30 p-2.5">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Thêm công việc
                </Button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
