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

  // Tactical Left priority border configurations
  const priorityBorderColor = task.priority === 'urgent'
    ? 'border-l-[#ff3b3b]'
    : task.priority === 'high'
      ? 'border-l-amber-500'
      : task.priority === 'medium'
        ? 'border-l-yellow-500'
        : 'border-l-[#00e5a0]'

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      className={cn(
        'group relative cursor-pointer border border-[#1e2a35] bg-[#0a0c0f] p-4 shadow-sm transition-all duration-200 rounded-none',
        'hover:shadow-md hover:border-[#00e5a0]/40 hover:bg-[#0f1318]/90 hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-sm border-l-[3px]',
        priorityBorderColor,
        className,
      )}
    >
      {/* Drag handle */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-3.5 w-3.5 text-[#00e5a0]/40" />
      </div>

      {/* Priority badge */}
      <div className="mb-2.5 flex items-center gap-1.5">
        <span className={cn(
          'inline-flex items-center rounded-none px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-wider uppercase border',
          task.priority === 'urgent'
            ? 'bg-red-500/10 text-red-500 border-red-500/30'
            : task.priority === 'high'
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
              : task.priority === 'medium'
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                : 'bg-[#00e5a0]/10 text-[#00e5a0] border-[#00e5a0]/30'
        )}>
          {priorityConfig.label.toUpperCase()}
        </span>
        {task.labels.length > 0 && (
          <span className="text-[9px] font-mono text-muted-foreground/60 uppercase">{task.labels.length} LABELS</span>
        )}
      </div>

      {/* Title */}
      <h4 className="mb-2 text-xs font-mono font-bold leading-snug text-white line-clamp-2 pr-4 transition-colors group-hover:text-[#00e5a0] uppercase tracking-wider">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((label) => (
            <Badge
              key={label.id}
              variant="secondary"
              className="h-5 rounded-none px-1.5 text-[8px] font-mono font-bold border"
              style={{ backgroundColor: `${label.color}10`, color: label.color, borderColor: `${label.color}25` }}
            >
              {label.name.toUpperCase()}
            </Badge>
          ))}
          {task.labels.length > 3 && (
            <Badge variant="secondary" className="h-5 rounded-none px-1.5 text-[8px] font-mono border bg-[#1e2a35] text-white border-[#1e2a35]">
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
                <Avatar className="h-5 w-5 rounded-none border border-[#1e2a35]">
                  <AvatarImage className="rounded-none object-cover" src={assignment.user.avatar || undefined} alt={assignment.user.name} />
                  <AvatarFallback className="rounded-none text-[8px] font-mono font-bold bg-[#1e2a35] text-[#00e5a0]">
                    {getInitials(assignment.user.name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-[#0f1318] border border-[#1e2a35] font-mono text-[9px] text-white">
                {assignment.user.name.toUpperCase()}
              </TooltipContent>
            </Tooltip>
          ))}
          {extraCount > 0 && (
            <div className="flex h-5 w-5 items-center justify-center bg-[#0a0c0f] border border-[#1e2a35] text-[8px] font-mono font-bold text-muted-foreground rounded-none">
              +{extraCount}
            </div>
          )}
        </div>

        {/* Due date + comments */}
        <div className="flex items-center gap-2 text-muted-foreground">
          {task.dueDate && (
            <div className={cn('flex items-center gap-1 text-[9px] font-mono', overdue && 'text-red-500 font-bold')}>
              <CalendarDays className="h-3 w-3" />
              <span>{formatRelativeDate(task.dueDate).toUpperCase()}</span>
            </div>
          )}
          {task._count.comments > 0 && (
            <div className="flex items-center gap-1 text-[9px] font-mono">
              <MessageSquare className="h-3 w-3" />
              <span>{task._count.comments}</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {task.progress > 0 && task.progress < 100 && (
        <div className="mt-2.5 h-1.5 w-full bg-[#0a0c0f] border border-[#1e2a35] rounded-none">
          <div
            className="h-full bg-[#00e5a0] transition-all duration-300"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

