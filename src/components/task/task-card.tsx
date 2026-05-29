'use client'

import { cn } from '@/lib/utils'
import { type Task } from '@/hooks/use-tasks'
import { useTaskStore } from '@/stores/task-store'
import { getInitials, formatRelativeDate, isOverdue, PRIORITY_CONFIG } from '@/lib/helpers'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CalendarDays, MessageSquare, GripVertical } from 'lucide-react'
import { useMemo } from 'react'

// ============================================
// Component
// ============================================

interface TaskCardProps {
  task: Task
  className?: string
}

export function TaskCard({ task, className }: TaskCardProps) {
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId)
  const setShowTaskDetail = useTaskStore((s) => s.setShowTaskDetail)

  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const overdue = task.dueDate && isOverdue(task.dueDate) && task.status !== 'done' && task.status !== 'cancelled'

  const visibleAssignees = useMemo(() => task.assignments.slice(0, 3), [task.assignments])
  const extraCount = Math.max(0, task.assignments.length - 3)

  const handleClick = () => {
    setSelectedTaskId(task.id)
    setShowTaskDetail(true)
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.setData('taskStatus', task.status)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer rounded-2xl border-ultra-thin bg-card/60 backdrop-blur-md p-4.5 shadow-sm transition-all duration-200',
        'hover:shadow-md hover:border-violet-500/25 hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-sm',
        `border-l-3 ${priorityConfig.borderColor}`,
        className,
      )}
    >
      {/* Drag handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>

      {/* Priority badge */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className={cn('inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase', priorityConfig.bgClass, priorityConfig.color)}>
          {priorityConfig.label}
        </span>
        {task.labels.length > 0 && (
          <span className="text-[10px] text-muted-foreground/75 font-semibold">{task.labels.length} nhãn</span>
        )}
      </div>

      {/* Title */}
      <h4 className="mb-3 text-sm font-semibold leading-snug text-foreground/90 line-clamp-2 pr-4 transition-colors group-hover:text-foreground">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mb-3.5 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="h-5 rounded-md px-1.5 text-[10px] font-bold border-0"
              style={{ backgroundColor: `${label.color}15`, color: label.color }}
            >
              {label.name}
            </Badge>
          ))}
          {task.labels.length > 3 && (
            <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] border-0 bg-muted font-bold">
              +{task.labels.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer: assignees + due date + comments */}
      <div className="flex items-center justify-between gap-2 mt-1">
        {/* Assignees */}
        <div className="flex items-center -space-x-1.5">
          {visibleAssignees.map((assignment) => (
            <Tooltip key={assignment.id}>
              <TooltipTrigger asChild>
                <Avatar className="h-6 w-6 ring-2 ring-background">
                  <AvatarImage src={assignment.user.avatar || undefined} alt={assignment.user.name} />
                  <AvatarFallback className="text-[8px] font-bold bg-gradient-to-br from-violet-500 to-indigo-600 text-white">
                    {getInitials(assignment.user.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {assignment.user.name}
              </TooltipContent>
            </Tooltip>
          ))}
          {extraCount > 0 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-background text-muted-foreground">
              +{extraCount}
            </div>
          )}
        </div>

        {/* Due date + comments */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.dueDate && (
            <div className={cn('flex items-center gap-1 text-[11px]', overdue && 'text-red-500 dark:text-red-400 font-bold')}>
              <CalendarDays className="h-3 w-3" />
              <span>{formatRelativeDate(task.dueDate)}</span>
            </div>
          )}
          {task._count.comments > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <GripVertical className="h-3 w-3 opacity-0" />
              <MessageSquare className="h-3 w-3" />
              <span>{task._count.comments}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {task.progress > 0 && task.progress < 100 && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-muted/65 border border-ultra-thin">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
