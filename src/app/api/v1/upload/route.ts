// POST /api/v1/upload — File upload endpoint
import { NextRequest } from 'next/server'
import { withAuth, getUserId } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')

// Allowed MIME types
const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip', 'application/x-rar-compressed',
  'text/plain', 'text/csv',
])

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req)

      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return errorResponse('VALIDATION_ERROR', 'Không có file được chọn', undefined, 400)
      }

      if (!ALLOWED_TYPES.has(file.type)) {
        return errorResponse('VALIDATION_ERROR', 'Loại file không được hỗ trợ', undefined, 400)
      }

      if (file.size > MAX_FILE_SIZE) {
        return errorResponse('VALIDATION_ERROR', 'File quá lớn. Tối đa 10MB.', undefined, 400)
      }

      // Ensure upload directory exists
      if (!existsSync(UPLOAD_DIR)) {
        await mkdir(UPLOAD_DIR, { recursive: true })
      }

      // Generate unique filename
      const ext = file.name.split('.').pop() || 'bin'
      const uniqueName = `${Date.now()}-${userId.slice(0, 8)}.${ext}`
      const filePath = join(UPLOAD_DIR, uniqueName)

      // Write file
      const bytes = await file.arrayBuffer()
      await writeFile(filePath, Buffer.from(bytes))

      const fileUrl = `/uploads/${uniqueName}`

      return successResponse({
        url: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
    } catch (error) {
      console.error('Upload error:', error)
      return serverErrorResponse('Không thể tải lên file')
    }
  })(request)
}
