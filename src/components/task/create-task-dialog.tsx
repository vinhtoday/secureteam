'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useTaskStore } from '@/stores/task-store'
import { useCreateTask, useAllUsers, useTaskLabels } from '@/hooks/use-tasks'
import { useAuthStore } from '@/stores/auth-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarDays, X, Plus, Users, Tag, Search, Loader2 } from 'lucide-react'

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
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

// ============================================
// Component
// ============================================

export function CreateTaskDialog() {
  const showCreateDialog = useTaskStore((s) => s.showCreateDialog)
  const setShowCreateDialog = useTaskStore((s) => s.setShowCreateDialog)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [assigneeSearch, setAssigneeSearch] = useState('')

  const createTask = useCreateTask()
  const user = useAuthStore((s) => s.user)

  const { data: allUsersRes } = useAllUsers({ search: assigneeSearch || undefined, limit: 20 })
  const allUsers = allUsersRes?.data ?? []

  const { data: labelsData } = useTaskLabels()
  const labels = labelsData ?? []

  const selectedAssignees = useMemo(
    () => allUsers.filter((u) => selectedAssigneeIds.includes(u.id)),
    [allUsers, selectedAssigneeIds],
  )

  const selectedLabels = useMemo(
    () => labels.filter((l) => selectedLabelIds.includes(l.id)),
    [labels, selectedLabelIds],
  )

  const availableLabels = useMemo(
    () => labels.filter((l) => !selectedLabelIds.includes(l.id)),
    [labels, selectedLabelIds],
  )

  const handleToggleAssignee = (userId: string) => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    )
  }

  const handleToggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId) ? prev.filter((id) => id !== labelId) : [...prev, labelId],
    )
  }

  const handleSubmit = () => {
    if (!title.trim()) return

    createTask.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : undefined,
        labelIds: selectedLabelIds.length > 0 ? selectedLabelIds : undefined,
      },
      {
        onSuccess: () => {
          resetForm()
          setShowCreateDialog(false)
        },
      },
    )
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setPriority('medium')
    setDueDate('')
    setSelectedAssigneeIds([])
    setSelectedLabelIds([])
    setAssigneeSearch('')
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm()
      setShowCreateDialog(false)
    }
  }

  return (
    <Dialog open={showCreateDialog} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-base font-bold">
            Tạo công việc mới
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="space-y-5">
            {/* Title */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Tiêu đề <span className="text-destructive">*</span>
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề công việc..."
                className="text-sm rounded-xl h-10 focus-visible:ring-violet-500/30"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                Mô tả
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết công việc..."
                className="text-sm rounded-xl min-h-[80px] resize-none focus-visible:ring-violet-500/30"
              />
            </div>

            {/* Priority & Due Date Row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Ưu tiên
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-10 text-sm rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[priority])} />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2 w-2 rounded-full', PRIORITY_COLORS[value])} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                  Hạn chót
                </label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 pl-9 text-sm rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Assignees */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="inline h-3 w-3 mr-1" />
                  Người thực hiện
                </label>
              </div>

              {/* Selected assignees */}
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedAssignees.map((u) => (
                    <Badge
                      key={u.id}
                      variant="secondary"
                      className="h-7 gap-1.5 rounded-lg pl-1 pr-2 text-xs border-0 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={u.avatar || undefined} alt={u.name} />
                        <AvatarFallback className="text-[8px] font-semibold">
                          {getInitials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      {u.name}
                      <button onClick={() => handleToggleAssignee(u.id)} className="ml-0.5 hover:opacity-70">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search assignees */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  placeholder="Tìm người dùng..."
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="h-9 pl-9 text-xs rounded-xl"
                />
              </div>

              {assigneeSearch && (
                <ScrollArea className="max-h-32 mt-1.5">
                  <div className="space-y-0.5">
                    {allUsers
                      .filter((u) => u.id !== user?.id && !selectedAssigneeIds.includes(u.id))
                      .slice(0, 8)
                      .map((u) => (
                        <button
                          key={u.id}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-muted/60 transition-colors text-left"
                          onClick={() => { handleToggleAssignee(u.id); setAssigneeSearch('') }}
                        >
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={u.avatar || undefined} alt={u.name} />
                            <AvatarFallback className="text-[8px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{u.name}</span>
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Labels */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                <Tag className="inline h-3 w-3 mr-1" />
                Nhãn
              </label>

              {selectedLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedLabels.map((l) => (
                    <Badge
                      key={l.id}
                      variant="secondary"
                      className="h-6 gap-1 rounded-lg pl-1.5 pr-2 text-[11px] font-medium border-0 cursor-pointer"
                      style={{ backgroundColor: `${l.color}20`, color: l.color }}
                      onClick={() => handleToggleLabel(l.id)}
                    >
                      {l.name}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                </div>
              )}

              {availableLabels.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {availableLabels.map((l) => (
                    <Badge
                      key={l.id}
                      variant="outline"
                      className="h-6 rounded-lg px-2 text-[11px] font-medium cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => handleToggleLabel(l.id)}
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                      {l.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/50 gap-2">
          <Button
            variant="outline"
            className="rounded-xl text-sm"
            onClick={() => handleClose(false)}
          >
            Hủy bỏ
          </Button>
          <Button
            className="rounded-xl text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm shadow-violet-500/25"
            onClick={handleSubmit}
            disabled={!title.trim() || createTask.isPending}
          >
            {createTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            Tạo công việc
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
