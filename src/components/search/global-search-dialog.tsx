'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { useGlobalSearch, type GlobalSearchResult } from '@/hooks/use-search'
import { useTaskStore } from '@/stores/task-store'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  MessageSquare,
  ListTodo,
  Users,
  FileText,
  ArrowRight,
  Command,
} from 'lucide-react'

// ============================================
// Helpers
// ============================================

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const STATUS_LABELS: Record<string, string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  review: 'Xem xét',
  done: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

type SearchTab = 'all' | 'messages' | 'tasks' | 'users'

const TABS: { id: SearchTab; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'Tất cả', icon: FileText },
  { id: 'messages', label: 'Tin nhắn', icon: MessageSquare },
  { id: 'tasks', label: 'Công việc', icon: ListTodo },
  { id: 'users', label: 'Người dùng', icon: Users },
]

// ============================================
// Component
// ============================================

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<SearchTab>('all')
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { data: searchResponse, isLoading } = useGlobalSearch(query, {
    limit: 10,
    types: activeTab === 'all' ? undefined : [activeTab === 'messages' ? 'messages' : activeTab === 'tasks' ? 'tasks' : 'users'],
  })

  const searchResult = searchResponse?.data
  const setSelectedTaskId = useTaskStore((s) => s.setSelectedTaskId)
  const setShowTaskDetail = useTaskStore((s) => s.setShowTaskDetail)

  // Flatten results based on tab
  const flatResults = getFlatResults(searchResult, activeTab)

  // Reset index on results/tab change
  const prevResultRef = useRef<string>('')
  const prevTabRef = useRef<string>(activeTab)
  const currentResultKey = `${searchResult?.data?.totalResults ?? 0}-${activeTab}`
  useEffect(() => {
    if (prevResultRef.current !== currentResultKey) {
      prevResultRef.current = currentResultKey
      // Reset selection when search results change
      setSelectedIndex(-1)
    }
  }, [currentResultKey])
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      prevTabRef.current = activeTab
      // Reset selection when tab changes
      setSelectedIndex(-1)
    }
  }, [activeTab])

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      setQuery('')
      setActiveTab('all')
      setSelectedIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [])

  const handleResultClick = useCallback((result: FlatResultItem) => {
    if (result.type === 'task') {
      setSelectedTaskId(result.id)
      setShowTaskDetail(true)
    }
    setOpen(false)
  }, [setSelectedTaskId, setShowTaskDetail])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      handleResultClick(flatResults[selectedIndex])
    }
  }, [selectedIndex, flatResults, handleResultClick])

  const getTabCount = (tab: SearchTab): number => {
    if (!searchResult) return 0
    switch (tab) {
      case 'messages': return searchResult.messages?.length ?? 0
      case 'tasks': return searchResult.tasks?.length ?? 0
      case 'users': return searchResult.users?.length ?? 0
      case 'all': return (searchResult.messages?.length ?? 0) + (searchResult.tasks?.length ?? 0) + (searchResult.users?.length ?? 0)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col">
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tin nhắn, công việc, người dùng..."
            className="border-0 shadow-none focus-visible:ring-0 h-auto p-0 text-sm"
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:flex h-5 items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-1.5 text-[10px] font-medium text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>

        {/* Tabs */}
        {query.trim().length > 0 && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border/30">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const count = getTabCount(tab.id)
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                    isActive
                      ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {tab.label}
                  {count > 0 && (
                    <span className={cn(
                      'h-4 min-w-4 flex items-center justify-center rounded-full px-1 text-[9px] font-bold',
                      isActive ? 'bg-violet-200 dark:bg-violet-800/50' : 'bg-muted',
                    )}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Results */}
        <ScrollArea className="flex-1 max-h-[400px]">
          <div ref={listRef} className="p-2">
            {query.trim().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Bắt đầu tìm kiếm</p>
                <p className="text-xs mt-0.5 opacity-60">Nhập từ khóa để tìm tin nhắn, công việc, hoặc người dùng</p>
              </div>
            ) : isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl p-3">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-2.5 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : flatResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">Không tìm thấy kết quả</p>
                <p className="text-xs mt-0.5 opacity-60">Thử từ khóa khác</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {/* Messages section */}
                {activeTab === 'all' && (searchResult?.messages?.length ?? 0) > 0 && (
                  <ResultSection title="Tin nhắn">
                    {(searchResult!.messages ?? []).slice(0, 3).map((msg, i) => (
                      <MessageResultItem
                        key={msg.id}
                        message={msg}
                        isSelected={selectedIndex === flatResults.findIndex((r) => r.id === msg.id)}
                        onClick={() => handleResultClick({ id: msg.id, type: 'message' })}
                      />
                    ))}
                  </ResultSection>
                )}

                {/* Tasks section */}
                {(activeTab === 'all' || activeTab === 'tasks') && (searchResult?.tasks?.length ?? 0) > 0 && (
                  <ResultSection title="Công việc">
                    {(searchResult!.tasks ?? []).map((task) => (
                      <TaskResultItem
                        key={task.id}
                        task={task}
                        isSelected={selectedIndex === flatResults.findIndex((r) => r.id === task.id)}
                        onClick={() => handleResultClick({ id: task.id, type: 'task' })}
                      />
                    ))}
                  </ResultSection>
                )}

                {/* Users section */}
                {(activeTab === 'all' || activeTab === 'users') && (searchResult?.users?.length ?? 0) > 0 && (
                  <ResultSection title="Người dùng">
                    {(searchResult!.users ?? []).map((u) => (
                      <UserResultItem
                        key={u.id}
                        user={u}
                        isSelected={selectedIndex === flatResults.findIndex((r) => r.id === u.id)}
                        onClick={() => handleResultClick({ id: u.id, type: 'user' })}
                      />
                    ))}
                  </ResultSection>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Types & Helpers
// ============================================

interface FlatResultItem {
  id: string
  type: 'message' | 'task' | 'user'
}

function getFlatResults(result: GlobalSearchResult | undefined, tab: SearchTab): FlatResultItem[] {
  if (!result) return []
  const items: FlatResultItem[] = []
  if (tab === 'all' || tab === 'messages') {
    for (const msg of result.messages ?? []) items.push({ id: msg.id, type: 'message' })
  }
  if (tab === 'all' || tab === 'tasks') {
    for (const task of result.tasks ?? []) items.push({ id: task.id, type: 'task' })
  }
  if (tab === 'all' || tab === 'users') {
    for (const user of result.users ?? []) items.push({ id: user.id, type: 'user' })
  }
  return items
}

// ============================================
// Sub-components
// ============================================

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        {title}
      </div>
      {children}
    </div>
  )
}

function MessageResultItem({
  message,
  isSelected,
  onClick,
}: {
  message: GlobalSearchResult['messages'][0]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        isSelected ? 'bg-violet-100 dark:bg-violet-900/20' : 'hover:bg-muted/60',
      )}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={message.sender.avatar || undefined} alt={message.sender.name} />
        <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
          {getInitials(message.sender.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold truncate">{message.sender.name}</span>
          <span className="text-[10px] text-muted-foreground truncate">trong {message.channel.name}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{message.content}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  )
}

function TaskResultItem({
  task,
  isSelected,
  onClick,
}: {
  task: GlobalSearchResult['tasks'][0]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        isSelected ? 'bg-violet-100 dark:bg-violet-900/20' : 'hover:bg-muted/60',
      )}
      onClick={onClick}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30 shrink-0">
        <ListTodo className="h-4 w-4 text-violet-600 dark:text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="h-4 text-[9px] font-medium rounded px-1 border-0">
            {STATUS_LABELS[task.status] || task.status}
          </Badge>
          <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_COLORS[task.priority] || 'bg-gray-400')} />
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  )
}

function UserResultItem({
  user,
  isSelected,
  onClick,
}: {
  user: GlobalSearchResult['users'][0]
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
        isSelected ? 'bg-violet-100 dark:bg-violet-900/20' : 'hover:bg-muted/60',
      )}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={user.avatar || undefined} alt={user.name} />
        <AvatarFallback className="text-[10px] font-semibold bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-700 dark:from-violet-900/40 dark:to-indigo-900/40 dark:text-violet-300">
          {getInitials(user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold truncate">{user.name}</p>
        <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  )
}
