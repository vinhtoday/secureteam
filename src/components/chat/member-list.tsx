'use client'

import { useState, useMemo, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore, type User } from '@/stores/auth-store'
import { useChannel, useRemoveChannelMember } from '@/hooks/use-channels'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  X,
  Crown,
  Shield,
  MessageSquarePlus,
  Search,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  File,
  Download,
  Users,
  Info,
  Calendar,
  Layers,
} from 'lucide-react'
import { UserAvatar } from './user-status-badge'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { api } from '@/lib/api'
import { type Message } from '@/hooks/use-messages'

interface MemberListProps {
  channelId: string | null
  open: boolean
  onClose: () => void
}

type TabType = 'members' | 'files' | 'info'

export function MemberList({ channelId, open, onClose }: MemberListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('members')
  const [memberSearch, setMemberSearch] = useState('')
  const [fileSearch, setFileSearch] = useState('')
  const [channelFiles, setChannelFiles] = useState<Message[]>([])
  const [filesLoading, setFilesLoading] = useState(false)

  const { data: channel, isLoading: channelLoading } = useChannel(channelId)

  // Fetch shared files in this channel
  useEffect(() => {
    if (channelId && activeTab === 'files') {
      setFilesLoading(true)
      api
        .get<Message[]>(`/api/v1/channels/${channelId}/messages?limit=100`)
        .then((res) => {
          const files = (res.data || []).filter((msg) => msg.fileUrl)
          setChannelFiles(files)
        })
        .catch((err) => console.error('Failed to fetch channel files:', err))
        .finally(() => setFilesLoading(false))
    }
  }, [channelId, activeTab])

  if (!open || !channelId) return null

  return (
    <div className="flex h-full w-80 flex-col border-l border-border/40 bg-sidebar/55 backdrop-blur-md animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-violet-650 dark:text-violet-400" />
          <h3 className="font-bold text-sm tracking-tight">Chi tiết nhóm</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          onClick={onClose}
          aria-label="Đóng chi tiết"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs list */}
      <div className="flex items-center gap-1 p-2 bg-muted/30 border-b border-border/30">
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200',
            activeTab === 'members'
              ? 'bg-background text-violet-650 dark:text-violet-400 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Thành viên
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200',
            activeTab === 'files'
              ? 'bg-background text-violet-650 dark:text-violet-400 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Tập tin
        </button>
        <button
          onClick={() => setActiveTab('info')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all duration-200',
            activeTab === 'info'
              ? 'bg-background text-violet-650 dark:text-violet-400 shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          )}
        >
          <Info className="h-3.5 w-3.5" />
          Giới thiệu
        </button>
      </div>

      {/* Dynamic contents based on selected tab */}
      {activeTab === 'members' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Member Search input */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                placeholder="Tìm thành viên..."
                className="h-8 pl-8 text-xs rounded-lg focus-visible:ring-violet-500/30"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              <MemberListTab
                channelId={channelId}
                searchQuery={memberSearch}
                channelLoading={channelLoading}
              />
            </div>
          </ScrollArea>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* File Search input */}
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                placeholder="Tìm tập tin..."
                className="h-8 pl-8 text-xs rounded-lg focus-visible:ring-violet-500/30"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3">
              {filesLoading ? (
                <div className="space-y-3 p-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <FilesListTab files={channelFiles} searchQuery={fileSearch} />
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {activeTab === 'info' && (
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* Info tab */}
            {channelLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : channel ? (
              <div className="space-y-5">
                {/* Channel Meta */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tên nhóm</h4>
                  <p className="text-base font-bold text-foreground break-all bg-card/40 border border-border/30 rounded-xl p-3 shadow-inner">
                    {channel.type === 'direct' ? channel.name : `# ${channel.name}`}
                  </p>
                </div>

                {channel.description && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mô tả</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed bg-card/45 border border-border/30 rounded-xl p-3">
                      {channel.description}
                    </p>
                  </div>
                )}

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2.5">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground/80" />
                      Phân loại
                    </span>
                    <span className="font-semibold capitalize bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 px-2 py-0.5 rounded-md">
                      {channel.type === 'public'
                        ? 'Công khai'
                        : channel.type === 'private'
                        ? 'Riêng tư'
                        : 'Trực tiếp'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2.5">
                    <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
                      Ngày tạo
                    </span>
                    <span className="font-semibold text-foreground/80">
                      {new Date(channel.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {channel.owner && (
                    <div className="flex items-center justify-between text-xs border-b border-border/30 pb-2.5">
                      <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        Chủ phòng
                      </span>
                      <span className="font-semibold text-foreground/80">{channel.owner.name}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground">Không tìm thấy thông tin nhóm</div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

// ============================================
// Member List Helper Subcomponent
// ============================================

function MemberListTab({
  channelId,
  searchQuery,
  channelLoading,
}: {
  channelId: string
  searchQuery: string
  channelLoading: boolean
}) {
  const user = useAuthStore((s) => s.user) as User | null
  const { data: channel } = useChannel(channelId)
  const { data: onlineUsersData } = useOnlineUsers()
  const removeMember = useRemoveChannelMember(channelId)

  const onlineUserIds = new Set(onlineUsersData?.map((u) => u.id) || [])
  const members = channel?.members || []
  const isSelfAdmin = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ADMIN'

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const q = searchQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.user?.name.toLowerCase().includes(q) ||
        m.user?.email.toLowerCase().includes(q)
    )
  }, [members, searchQuery])

  if (channelLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    )
  }

  const admins = filteredMembers.filter((m) => m.role === 'admin')
  const regularMembers = filteredMembers.filter((m) => m.role !== 'admin')

  const handleRemoveMember = (userId: string) => {
    if (confirm('Bạn có chắc muốn xóa thành viên này khỏi kênh?')) {
      removeMember.mutate(userId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Crown className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground">
              Quản trị viên — {admins.length}
            </span>
          </div>
          <div className="space-y-0.5">
            {admins.map((member) => (
              <MemberItem
                key={member.userId}
                member={member}
                isOnline={onlineUserIds.has(member.userId)}
                isCurrentUser={member.userId === user?.id}
                isAdmin={isSelfAdmin}
                onRemove={handleRemoveMember}
              />
            ))}
          </div>
        </div>
      )}

      {/* Regular members */}
      {regularMembers.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <span className="text-xs font-semibold text-muted-foreground">
              Thành viên — {regularMembers.length}
            </span>
          </div>
          <div className="space-y-0.5">
            {regularMembers.map((member) => (
              <MemberItem
                key={member.userId}
                member={member}
                isOnline={onlineUserIds.has(member.userId)}
                isCurrentUser={member.userId === user?.id}
                isAdmin={isSelfAdmin}
                onRemove={handleRemoveMember}
              />
            ))}
          </div>
        </div>
      )}

      {filteredMembers.length === 0 && (
        <div className="flex flex-col items-center py-8 text-center">
          <MessageSquarePlus className="h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs text-muted-foreground">Không tìm thấy thành viên</p>
        </div>
      )}
    </div>
  )
}

interface MemberItemProps {
  member: any
  isOnline: boolean
  isCurrentUser: boolean
  isAdmin: boolean
  onRemove: (userId: string) => void
}

function MemberItem({
  member,
  isOnline,
  isCurrentUser,
  isAdmin,
  onRemove,
}: MemberItemProps) {
  const name = member.user?.name || 'Người dùng'
  const email = member.user?.email

  return (
    <div className="flex items-center gap-2 rounded-xl px-2.5 py-2 hover:bg-muted/50 transition-colors group">
      <UserAvatar
        name={name}
        avatar={member.user?.avatar}
        status={isOnline ? 'online' : 'offline'}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-foreground/80">
            {name}
            {isCurrentUser && <span className="text-muted-foreground font-normal"> (bạn)</span>}
          </span>
          {member.role === 'admin' && <Shield className="h-3 w-3 text-amber-500 shrink-0" />}
        </div>
        {email && <div className="truncate text-[10px] text-muted-foreground">{email}</div>}
      </div>
      {isAdmin && !isCurrentUser && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
          onClick={() => onRemove(member.userId)}
          aria-label="Xóa thành viên"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}

// ============================================
// Shared Files Subcomponent
// ============================================

function FilesListTab({ files, searchQuery }: { files: Message[]; searchQuery: string }) {
  // Format bytes to human readable format
  const formatBytes = (bytes?: number | null) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Get matching icon for file mime type / filename
  const getFileIcon = (fileName?: string | null, mime?: string | null) => {
    const fn = (fileName || '').toLowerCase()
    const m = (mime || '').toLowerCase()

    if (m.startsWith('image/') || fn.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) {
      return ImageIcon
    }
    if (m.includes('spreadsheet') || m.includes('excel') || fn.match(/\.(xls|xlsx|csv)$/)) {
      return FileSpreadsheet
    }
    if (m.includes('json') || m.includes('javascript') || fn.match(/\.(js|ts|json|html|css|py)$/)) {
      return FileCode
    }
    return File
  }

  // Filter files based on search
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files
    const q = searchQuery.toLowerCase()
    return files.filter(
      (f) =>
        f.fileName?.toLowerCase().includes(q) ||
        f.sender?.name.toLowerCase().includes(q)
    )
  }, [files, searchQuery])

  if (filteredFiles.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30 animate-pulse" />
        <p className="mt-2 text-xs text-muted-foreground/75 font-semibold">Chưa chia sẻ tệp nào</p>
        <p className="text-[10px] text-muted-foreground/60 max-w-[150px] mx-auto mt-1 leading-normal">
          Các tệp hoặc hình ảnh đính kèm trong tin nhắn sẽ hiển thị tại đây
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {filteredFiles.map((file) => {
        const Icon = getFileIcon(file.fileName, file.fileMimeType)
        return (
          <div
            key={file.id}
            className="flex items-center gap-2.5 rounded-xl border border-border/30 bg-card/35 hover:bg-muted/40 p-2.5 transition-colors group"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 shrink-0">
              <Icon className="h-4.5 w-4.5 text-violet-650 dark:text-violet-400" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-bold text-foreground/80 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {file.fileName || 'Tài liệu không tên'}
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/80 mt-0.5">
                <span>{formatBytes(file.fileSize)}</span>
                <span>•</span>
                <span className="truncate max-w-[80px]">bởi {file.sender?.name}</span>
              </div>
            </div>

            {file.fileUrl && (
              <a
                href={file.fileUrl}
                download={file.fileName || 'download'}
                target="_blank"
                rel="noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-violet-100 dark:hover:bg-violet-950/40 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                title="Tải tập tin"
              >
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}
