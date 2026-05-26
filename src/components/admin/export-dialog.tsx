'use client'

import { useState } from 'react'
import { useExportData } from '@/hooks/use-admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('messages')
  const [isExporting, setIsExporting] = useState(false)
  const exportData = useExportData()

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await exportData.mutateAsync({ type })
      toast.success('Xuất dữ liệu thành công')
      setOpen(false)
    } catch {
      toast.error('Xuất dữ liệu thất bại')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Xuất dữ liệu
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu</DialogTitle>
          <DialogDescription>
            Chọn loại dữ liệu bạn muốn xuất
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Loại dữ liệu</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="messages">Tin nhắn</SelectItem>
                <SelectItem value="users">Người dùng</SelectItem>
                <SelectItem value="audit">Nhật ký kiểm soát</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xuất...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Xuất
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
