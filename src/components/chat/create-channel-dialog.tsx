'use client'

import { useState } from 'react'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useAllUsers } from '@/hooks/use-auth'
import { api } from '@/lib/api'
import { ApiClientError } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { UserAvatar } from './user-status-badge'
import { Plus, Loader2, Search } from 'lucide-react'

interface CreateChannelDialogProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: () => void
}

export function CreateChannelDialog({
  trigger,
  open,
  onOpenChange,
  onCreated,
}: CreateChannelDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'public' | 'private'>('public')
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')
  const user = useAuthStore((s) => s.user) as User | null
  const queryClient = useQueryClient()

  const { data: usersData } = useAllUsers({
    search: search || undefined,
    limit: 20,
  })

  const users = usersData?.data || []

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Vui lòng nhập tên kênh')
      return
    }

    setIsCreating(true)
    setError('')
    try {
      const memberIds = Array.from(selectedMembers)
      await api.post('/api/v1/channels', {
        name: name.trim().toLowerCase(),
        description: description.trim() || undefined,
        type,
        memberIds: memberIds.length > 0 ? memberIds : undefined,
      })
      setName('')
      setDescription('')
      setType('public')
      setSelectedMembers(new Set())
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      onCreated?.()
      onOpenChange?.(false)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      } else {
        setError('Tạo kênh thất bại')
      }
    } finally {
      setIsCreating(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Kênh mới
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo kênh mới</DialogTitle>
          <DialogDescription>
            Tạo một kênh để nhóm trò chuyện với đồng nghiệp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Tên kênh</Label>
            <Input
              placeholder="tên-kênh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="space-y-2">
            <Label>Mô tả (tùy chọn)</Label>
            <Textarea
              placeholder="Mô tả ngắn về kênh..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Loại kênh</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                  type === 'public'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setType('public')}
              >
                <div className="text-lg">#</div>
                <div>
                  <div className="text-sm font-medium">Công khai</div>
                  <div className="text-xs text-muted-foreground">Ai cũng có thể tham gia</div>
                </div>
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 rounded-lg border p-3 text-left transition-colors ${
                  type === 'private'
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted'
                }`}
                onClick={() => setType('private')}
              >
                <div className="text-lg">🔒</div>
                <div>
                  <div className="text-sm font-medium">Kín</div>
                  <div className="text-xs text-muted-foreground">Chỉ thành viên mới thấy</div>
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Thêm thành viên</Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm thành viên..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <ScrollArea className="max-h-40">
              <div className="space-y-1">
                {users
                  .filter((u) => u.id !== user?.id)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                        selectedMembers.has(u.id)
                          ? 'bg-primary/5'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => toggleMember(u.id)}
                    >
                      <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                      <span className="flex-1 truncate text-sm">{u.name}</span>
                      {selectedMembers.has(u.id) && (
                        <span className="text-primary text-xs font-medium">Đã chọn</span>
                      )}
                    </button>
                  ))}
                {users.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    Không tìm thấy thành viên
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)} disabled={isCreating}>
            Hủy
          </Button>
          <Button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo...
              </>
            ) : (
              'Tạo kênh'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
