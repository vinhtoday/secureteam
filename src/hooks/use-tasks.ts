'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { TaskFilters } from '@/stores/task-store'

// ============================================
// Types
// ============================================

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  progress: number
  startDate?: string
  dueDate?: string
  completedAt?: string
  channelId?: string
  parentId?: string
  position: number
  isArchived: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  creator: { id: string; name: string; avatar?: string }
  assignments: TaskAssignment[]
  labels: { id: string; name: string; color: string }[]
  _count: { comments: number; attachments: number; children: number }
}

export interface TaskAssignment {
  id: string
  userId: string
  assignedBy: string
  assignedAt: string
  user: { id: string; name: string; avatar?: string; department?: string }
}

export interface TaskComment {
  id: string
  taskId: string
  userId: string
  content: string
  mentions?: string
  createdAt: string
  updatedAt: string
  user: { id: string; name: string; avatar?: string }
}

export interface TaskActivity {
  id: string
  taskId: string
  userId: string
  action: string
  oldValue?: string
  newValue?: string
  createdAt: string
  user: { id: string; name: string; avatar?: string }
}

export interface TaskLabel {
  id: string
  name: string
  color: string
}

export interface KanbanColumn {
  status: string
  tasks: Task[]
}

// ============================================
// Helper
// ============================================

function buildTaskParams(filters: TaskFilters, page?: number, limit?: number): string {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.priority) params.set('priority', filters.priority)
  if (filters.assigneeId) params.set('assigneeId', filters.assigneeId)
  if (filters.labelId) params.set('labelId', filters.labelId)
  if (filters.search) params.set('search', filters.search)
  if (filters.channelId) params.set('channelId', filters.channelId)
  if (page) params.set('page', String(page))
  if (limit) params.set('limit', String(limit))
  return params.toString()
}

// ============================================
// Task CRUD Hooks
// ============================================

/**
 * Get tasks with filters and pagination
 */
export function useTasks(filters?: TaskFilters, page?: number, limit?: number) {
  return useQuery({
    queryKey: ['tasks', filters, page, limit],
    queryFn: async () => {
      const params = buildTaskParams(filters ?? {}, page, limit)
      const res = await api.get<Task[]>(`/api/v1/tasks?${params}`)
      return res
    },
  })
}

/**
 * Get a single task with full relations
 */
export function useTask(id: string | null) {
  return useQuery({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await api.get<Task>(`/api/v1/tasks/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      title: string
      description?: string
      status?: string
      priority?: string
      startDate?: string
      dueDate?: string
      channelId?: string
      parentId?: string
      labelIds?: string[]
      assigneeIds?: string[]
    }) => {
      const res = await api.post<Task>('/api/v1/tasks', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      title?: string
      description?: string
      status?: string
      priority?: string
      progress?: number
      startDate?: string
      dueDate?: string
      channelId?: string
      parentId?: string
      position?: number
      isArchived?: boolean
    }) => {
      const res = await api.patch<Task>(`/api/v1/tasks/${id}`, data)
      return res.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/v1/tasks/${id}`)
      return res
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

/**
 * Bulk update tasks (e.g., change status for multiple tasks)
 */
export function useBulkUpdateTasks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: {
      taskIds: string[]
      updates: {
        status?: string
        priority?: string
        assigneeId?: string
        labelId?: string
        isArchived?: boolean
      }
    }) => {
      const res = await api.post<{ updated: number }>('/api/v1/tasks/bulk', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

// ============================================
// Task Comments Hooks
// ============================================

/**
 * Get comments for a task
 */
export function useTaskComments(taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', taskId, 'comments'],
    queryFn: async () => {
      const res = await api.get<TaskComment[]>(`/api/v1/tasks/${taskId}/comments`)
      return res.data
    },
    enabled: !!taskId,
  })
}

/**
 * Create a comment on a task
 */
export function useCreateTaskComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      content,
      mentions,
    }: {
      taskId: string
      content: string
      mentions?: string[]
    }) => {
      const res = await api.post<TaskComment>(`/api/v1/tasks/${taskId}/comments`, {
        content,
        mentions,
      })
      return res.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
    },
  })
}

// ============================================
// Task Assignments Hooks
// ============================================

/**
 * Get assignments for a task
 */
export function useTaskAssignments(taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', taskId, 'assignments'],
    queryFn: async () => {
      const res = await api.get<TaskAssignment[]>(`/api/v1/tasks/${taskId}/assignments`)
      return res.data
    },
    enabled: !!taskId,
  })
}

/**
 * Assign a user to a task
 */
export function useAssignTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string
      userId: string
    }) => {
      const res = await api.post<TaskAssignment>(
        `/api/v1/tasks/${taskId}/assignments`,
        { userId }
      )
      return res.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

/**
 * Unassign a user from a task
 */
export function useUnassignTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      taskId,
      assignmentId,
    }: {
      taskId: string
      assignmentId: string
    }) => {
      const res = await api.delete(
        `/api/v1/tasks/${taskId}/assignments/${assignmentId}`
      )
      return res
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId, 'assignments'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })
}

// ============================================
// Task Activity Hooks
// ============================================

/**
 * Get activity log for a task
 */
export function useTaskActivities(taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', taskId, 'activities'],
    queryFn: async () => {
      const res = await api.get<TaskActivity[]>(`/api/v1/tasks/${taskId}/activities`)
      return res.data
    },
    enabled: !!taskId,
  })
}

// ============================================
// Task Labels Hooks
// ============================================

/**
 * Get all available labels
 */
export function useTaskLabels() {
  return useQuery({
    queryKey: ['tasks', 'labels'],
    queryFn: async () => {
      const res = await api.get<TaskLabel[]>('/api/v1/labels')
      return res.data
    },
  })
}

/**
 * Create a new label
 */
export function useCreateLabel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const res = await api.post<TaskLabel>('/api/v1/labels', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'labels'] })
    },
  })
}

// ============================================
// Kanban Hooks
// ============================================

/**
 * Get tasks grouped by status for Kanban board
 */
export function useKanbanTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: ['kanban', filters],
    queryFn: async () => {
      const params = buildTaskParams(filters ?? {})
      const res = await api.get<KanbanColumn[]>(`/api/v1/tasks/kanban?${params}`)
      return res.data
    },
  })
}
