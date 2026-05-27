'use client'

import { create } from 'zustand'

// ============================================
// Types
// ============================================

export interface TaskFilters {
  status?: string | null
  priority?: string | null
  assigneeId?: string | null
  labelId?: string | null
  search?: string
  channelId?: string | null
}

interface TaskState {
  // Filters
  filters: TaskFilters
  setFilters: (filters: Partial<TaskFilters>) => void
  resetFilters: () => void

  // Selected task
  selectedTaskId: string | null
  setSelectedTaskId: (id: string | null) => void

  // View mode
  viewMode: 'kanban' | 'list'
  setViewMode: (mode: 'kanban' | 'list') => void

  // UI state
  showCreateDialog: boolean
  setShowCreateDialog: (show: boolean) => void
  showTaskDetail: boolean
  setShowTaskDetail: (show: boolean) => void
}

// ============================================
// Store
// ============================================

const defaultFilters: TaskFilters = {
  status: null,
  priority: null,
  assigneeId: null,
  labelId: null,
  search: undefined,
  channelId: null,
}

export const useTaskStore = create<TaskState>((set) => ({
  // Filters
  filters: { ...defaultFilters },

  setFilters: (partial) =>
    set((state) => ({
      filters: { ...state.filters, ...partial },
    })),

  resetFilters: () =>
    set({
      filters: { ...defaultFilters },
    }),

  // Selected task
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  // View mode
  viewMode: 'kanban',
  setViewMode: (mode) => set({ viewMode: mode }),

  // UI state
  showCreateDialog: false,
  setShowCreateDialog: (show) => set({ showCreateDialog: show }),
  showTaskDetail: false,
  setShowTaskDetail: (show) => set({ showTaskDetail: show }),
}))
