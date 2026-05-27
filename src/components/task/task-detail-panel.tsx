'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/stores/task-store'
import { useAuthStore } from '@/stores/auth-store'
import {
  useTask,
  useTaskComments,
  useTaskActivities,
  useUpdateTask,
  useCreateTaskComment,
  useAssignTask,
  useUnassignTask,
  useAllUsers,
  useTaskLabels,
  type TaskComment,
  type TaskActivity,
} from '@/hooks/use-tasks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  X,
  CalendarDays,
  MessageSquare,
  Send,
  Clock,
  UserPlus,
  UserMinus,
  Tag,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  Activity,
  ListTodo,
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
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHr < 24) return `${diffHr} giờ trước`
  if (diffDay < 7) return `${diffDay} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date < today
}

function highlightMentions(text: string): (string | { name: string })[] {
  const parts: (string | { name: string })[] = []
  const regex = /@(\w+)/g
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push({ name: match[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Xem xét',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

function getActivityLabel(action: string, oldValue?: string, newValue?: string): string {
  switch (action) {
    case 'created': return 'đã tạo công việc'
    case 'status_changed': return `đã thay đổi trạng thái từ "${STATUS_LABELS[oldValue || ''] || oldValue}" thành "${STATUS_LABELS[newValue || ''] || newValue}"`
    case 'priority_changed': return `đã thay đổi ưu tiên từ "${PRIORITY_LABELS[oldValue || ''] || oldValue}" thành "${PRIORITY_LABELS[newValue || ''] || newValue}"`
    case 'assigned': return `đã giao cho ${newValue || ''}`
    case 'unassigned': return `đã gỡ ${newValue || ''}`
    case 'comment_added': return 'đã thêm bình luận'
    case 'progress_updated': return `đã cập nhật tiến độ ${newValue || ''}%`
    case 'title_changed': return 'đã đổi tiêu đề'
    case 'due_date_changed': return 'đã thay đổi hạn chót'
    default: return action
  }
}

// ============================================
// Component
// ============================================

export function TaskDetailPanel() {
  const selectedTaskId = useTaskStore((s) => s.selectedTaskId)
  const showTaskDetail = useTaskStore((s) => s.showTaskDetail)
  const setShowTaskDetail = useTaskStore((s) => s.setShowTaskDetail)
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId)

  const { data: task, isLoading } = useTask(selectedTaskId)
  const { data: comments, isLoading: commentsLoading } = useTaskComments(selectedTaskId)
  const { data: activities } = useTaskActivities(selectedTaskId)
  const updateTask = useUpdateTask()
  const createComment = useCreateTaskComment()
  const assignTask = useAssignTask()
  const unassignTask = useUnassignTask()

  const user = useAuthStore((s) => s.user)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [prevTaskId, setPrevTaskId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')
  const [activityOpen, setActivityOpen] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [showAssigneeSearch, setShowAssigneeSearch] = useState(false)
  const commentsEndRef = useRef<HTMLDivElement>(null)

  const { data: allUsersRes } = useAllUsers({ search: assigneeSearch || undefined, limit: 20 })
  const allUsers = allUsersRes?.data ?? []

  const { data: labelsData } = useTaskLabels()
  const labels = labelsData ?? []

  // Sync state when task changes
  useEffect(() => {
    if (task && task.id !== prevTaskId) {
      setEditTitle(task.title)
      setEditDescription(task.description || '')
      setPrevTaskId(task.id)
      setCommentText('')
      setIsEditingTitle(false)
    }
  }, [task, prevTaskId])

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  // Filter users not already assigned
  const assignableUsers = useMemo(() => {
    const assignedIds = new Set(task?.assignments.map((a) => a.userId))
    return allUsers.filter((u) => u.id !== user?.id && !assignedIds.has(u.id))
  }, [allUsers, task?.assignments, user?.id])

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle !== task?.title && selectedTaskId) {
      updateTask.mutate({ id: selectedTaskId, title: editTitle.trim() })
    }
    setIsEditingTitle(false)
  }

  const handleSaveDescription = () => {
    if (selectedTaskId && editDescription !== (task?.description || '')) {
      updateTask.mutate({ id: selectedTaskId, description: editDescription })
    }
  }

  const handleStatusChange = (newStatus: string) => {
    if (selectedTaskId) {
      updateTask.mutate({ id: selectedTaskId, status: newStatus })
    }
  }

  const handlePriorityChange = (newPriority: string) => {
    if (selectedTaskId) {
      updateTask.mutate({ id: selectedTaskId, priority: newPriority })
    }
  }

  const handleProgressChange = (value: number[]) => {
    if (selectedTaskId) {
      updateTask.mutate({ id: selectedTaskId, progress: value[0] })
    }
  }

  const handleDueDateChange = (dateStr: string) => {
    if (selectedTaskId) {
      updateTask.mutate({ id: selectedTaskId, dueDate: dateStr || undefined })
    }
  }

  const handleAssignUser = (userId: string) => {
    if (selectedTaskId) {
      assignTask.mutate({ taskId: selectedTaskId, userId })
      setShowAssigneeSearch(false)
      setAssigneeSearch('')
    }
  }

  const handleUnassignUser = (assignmentId: string) => {
    if (selectedTaskId) {
      unassignTask.mutate({ taskId: selectedTaskId, assignmentId })
    }
  }

  const handleSendComment = () => {
    if (commentText.trim() && selectedTaskId) {
      createComment.mutate(
        { taskId: selectedTaskId, content: commentText.trim() },
        { onSuccess: () => setCommentText('') },
      )
    }
  }

  const handleClose = () => {
    setShowTaskDetail(false)
    setSelectedTaskId(null)
    setIsEditingTitle(false)
    setCommentText('')
  }

  const commentList = comments ?? []
  const activityList = (activities ?? []).slice(0, 20)

  return (
    <Sheet open={showTaskDetail} onOpenChange={(open) => { if (!open) handleClose() }}>
      <SheetContent className="w-full sm:max-w-[540px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold text-muted-foreground">
              Chi tiết công việc
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : !task ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Không tìm thấy công việc
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Title */}
              <div className="group">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-lg font-bold h-auto py-1 border-primary/50 focus-visible:ring-primary/30"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setIsEditingTitle(false) }}
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSaveTitle}>
                      <Check className="h-4 w-4 text-emerald-500" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex items-start gap-2 cursor-pointer group/title"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <h2 className="text-lg font-bold leading-tight flex-1">{task.title}</h2>
                    <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  Tạo bởi {task.creator.name} · {formatRelativeDate(task.createdAt)}
                </p>
              </div>

              {/* Status & Priority Row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Trạng thái
                  </label>
                  <Select value={task.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Ưu tiên
                  </label>
                  <Select value={task.priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-9 text-xs rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[task.priority] || 'bg-gray-400')} />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[value] || 'bg-gray-400')} />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Progress */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Tiến độ: {task.progress}%
                </label>
                <Slider
                  value={[task.progress]}
                  onValueChange={handleProgressChange}
                  max={100}
                  step={5}
                  className="py-2"
                />
              </div>

              {/* Due Date */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Hạn chót
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className={cn(
                      'h-9 pl-9 text-xs rounded-xl',
                      task.dueDate && isOverdue(task.dueDate) && task.status !== 'done' && 'border-red-300 dark:border-red-700 focus-visible:ring-red-300'
                    )}
                  />
                </div>
                {task.dueDate && isOverdue(task.dueDate) && task.status !== 'done' && (
                  <p className="mt-1 text-[11px] text-red-500 font-medium">Đã quá hạn!</p>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Mô tả
                </label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onBlur={handleSaveDescription}
                  placeholder="Thêm mô tả cho công việc..."
                  className="min-h-[100px] text-sm rounded-xl resize-none"
                />
              </div>

              <Separator />

              {/* Assignees */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Người thực hiện
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-[11px] text-violet-600 dark:text-violet-400"
                    onClick={() => setShowAssigneeSearch(!showAssigneeSearch)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Thêm
                  </Button>
                </div>

                {task.assignments.length === 0 && !showAssigneeSearch && (
                  <p className="text-xs text-muted-foreground/60 py-2">Chưa giao cho ai</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {task.assignments.map((assignment) => (
                    <div key={assignment.id} className="group/assignee flex items-center gap-2 rounded-xl bg-muted/50 px-2.5 py-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={assignment.user.avatar || undefined} alt={assignment.user.name} />
                        <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                          {getInitials(assignment.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{assignment.user.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover/assignee:opacity-100"
                        onClick={() => handleUnassignUser(assignment.id)}
                      >
                        <UserMinus className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {showAssigneeSearch && (
                  <div className="mt-2 space-y-2 animate-fade-in-up">
                    <Input
                      placeholder="Tìm người dùng..."
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      className="h-8 text-xs rounded-xl"
                      autoFocus
                    />
                    <ScrollArea className="max-h-40">
                      <div className="space-y-0.5">
                        {assignableUsers.length === 0 ? (
                          <p className="text-xs text-muted-foreground/60 py-2 text-center">Không tìm thấy</p>
                        ) : (
                          assignableUsers.map((u) => (
                            <button
                              key={u.id}
                              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted/60 transition-colors text-left"
                              onClick={() => handleAssignUser(u.id)}
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={u.avatar || undefined} alt={u.name} />
                                <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{u.name}</p>
                                {u.department && <p className="text-[10px] text-muted-foreground truncate">{u.department}</p>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>

              <Separator />

              {/* Labels */}
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">
                  <Tag className="inline h-3 w-3 mr-1" />
                  Nhãn
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {task.labels.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 py-1">Chưa có nhãn</p>
                  ) : (
                    task.labels.map((label) => (
                      <Badge
                        key={label.id}
                        variant="secondary"
                        className="rounded-lg text-[11px] font-medium border-0 cursor-default"
                        style={{ backgroundColor: `${label.color}20`, color: label.color }}
                      >
                        {label.name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <Separator />

              {/* Comments Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Bình luận ({commentList.length})
                  </label>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto mb-3">
                  {commentsLoading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="flex gap-2.5">
                        <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-12 w-full rounded-lg" />
                        </div>
                      </div>
                    ))
                  ) : commentList.length === 0 ? (
                    <p className="text-xs text-muted-foreground/60 py-4 text-center">Chưa có bình luận</p>
                  ) : (
                    commentList.map((comment: TaskComment) => (
                      <CommentItem key={comment.id} comment={comment} />
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={user?.avatar || undefined} alt={user?.name} />
                    <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                      {user?.name ? getInitials(user.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 relative">
                    <Input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Viết bình luận... (@ để mention)"
                      className="h-9 text-xs rounded-xl pr-9"
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() } }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={handleSendComment}
                      disabled={!commentText.trim()}
                    >
                      <Send className="h-3 w-3 text-violet-500" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Activity Log */}
              <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Hoạt động ({activityList.length})
                      </span>
                    </div>
                    {activityOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 max-h-[250px] overflow-y-auto">
                    {activityList.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60 py-2 text-center">Chưa có hoạt động</p>
                    ) : (
                      activityList.map((activity: TaskActivity) => (
                        <div key={activity.id} className="flex items-start gap-2.5 py-1.5">
                          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                            <AvatarImage src={activity.user.avatar || undefined} alt={activity.user.name} />
                            <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                              {getInitials(activity.user.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs">
                              <span className="font-semibold">{activity.user.name}</span>{' '}
                              <span className="text-muted-foreground">
                                {getActivityLabel(activity.action, activity.oldValue, activity.newValue)}
                              </span>
                            </p>
                            <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              {formatRelativeDate(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ============================================
// Sub-components
// ============================================

function CommentItem({ comment }: { comment: TaskComment }) {
  const parts = useMemo(() => highlightMentions(comment.content), [comment.content])

  return (
    <div className="flex gap-2.5 animate-fade-in-up">
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={comment.user.avatar || undefined} alt={comment.user.name} />
        <AvatarFallback className="text-[9px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
          {getInitials(comment.user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold">{comment.user.name}</span>
          <span className="text-[10px] text-muted-foreground">{formatRelativeDate(comment.createdAt)}</span>
        </div>
        <p className="mt-0.5 text-xs text-foreground/90 leading-relaxed break-words">
          {parts.map((part, i) =>
            typeof part === 'string' ? (
              <span key={i}>{part}</span>
            ) : (
              <span key={i} className="inline-flex items-center rounded bg-violet-100 px-1 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                @{part.name}
              </span>
            )
          )}
        </p>
      </div>
    </div>
  )
}
