'use client'

import { useState } from 'react'
import { useAdminUsers, useUpdateUser, useDeleteUser } from '@/hooks/use-admin'
import { useQueryClient } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { UserAvatar } from '@/components/chat/user-status-badge'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { AdminUser } from '@/hooks/use-admin'

export function UserManagement() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState('')
  const [editIsActive, setEditIsActive] = useState(true)
  const [editIsLocked, setEditIsLocked] = useState(false)
  const [error, setError] = useState('')

  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useAdminUsers({
    search: search || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    page,
    limit: 10,
  })

  const updateUser = useUpdateUser(editingUser?.id || '')
  const deleteUser = useDeleteUser(deletingUser?.id || '')

  const users = data?.data || []
  const meta = data?.meta

  const handleEdit = (user: AdminUser) => {
    setEditingUser(user)
    setEditName(user.name)
    setEditRole(user.role.name)
    setEditIsActive(user.isActive)
    setEditIsLocked(user.isLocked)
    setError('')
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    try {
      await updateUser.mutateAsync({
        name: editName,
        isActive: editIsActive,
        isLocked: editIsLocked,
      })
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setEditingUser(null)
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message)
      }
    }
  }

  const handleDelete = async () => {
    if (!deletingUser) return
    try {
      await deleteUser.mutateAsync()
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      setDeletingUser(null)
    } catch {
      // Silent
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge variant="destructive" className="text-[10px]">QT tối cao</Badge>
      case 'ADMIN':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">QT viên</Badge>
      case 'LEADER':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">Trưởng nhóm</Badge>
      default:
        return <Badge variant="secondary" className="text-[10px]">Thành viên</Badge>
    }
  }

  const getStatusBadge = (user: AdminUser) => {
    if (!user.isActive) {
      return <Badge variant="outline" className="text-[10px] text-muted-foreground">Vô hiệu</Badge>
    }
    if (user.isLocked) {
      return <Badge variant="outline" className="text-[10px] text-destructive">Khóa</Badge>
    }
    return <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400">Hoạt động</Badge>
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="text-2xl font-bold">Quản lý người dùng</h2>
        <p className="text-sm text-muted-foreground">Quản lý tài khoản và phân quyền</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tên, email..."
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Vai trò" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả vai trò</SelectItem>
            <SelectItem value="SUPER_ADMIN">QT tối cao</SelectItem>
            <SelectItem value="ADMIN">QT viên</SelectItem>
            <SelectItem value="LEADER">Trưởng nhóm</SelectItem>
            <SelectItem value="MEMBER">Thành viên</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="inactive">Vô hiệu</SelectItem>
            <SelectItem value="locked">Khóa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="hidden lg:table-cell">Ngày tạo</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex flex-col items-center py-8">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <p className="mt-2 text-sm text-muted-foreground">Không thể tải danh sách người dùng</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Không tìm thấy người dùng
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <UserAvatar name={u.name} avatar={u.avatar} size="sm" />
                  </TableCell>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{getRoleBadge(u.role.name)}</TableCell>
                  <TableCell>{getStatusBadge(u)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                    {format(new Date(u.createdAt), 'dd/MM/yyyy', { locale: vi })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)} aria-label="Chỉnh sửa">
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingUser(u)}
                        aria-label="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Trang {meta.page} / {meta.totalPages} ({meta.total} người dùng)
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Trước
            </Button>
            <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>
              {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">QT tối cao</SelectItem>
                  <SelectItem value="ADMIN">QT viên</SelectItem>
                  <SelectItem value="LEADER">Trưởng nhóm</SelectItem>
                  <SelectItem value="MEMBER">Thành viên</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} className="rounded" />
                Hoạt động
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editIsLocked} onChange={(e) => setEditIsLocked(e.target.checked)} className="rounded" />
                Khóa tài khoản
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Hủy</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateUser.isPending}
            >
              {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa người dùng</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn vô hiệu hóa người dùng <strong>{deletingUser?.name}</strong>? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteUser.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
