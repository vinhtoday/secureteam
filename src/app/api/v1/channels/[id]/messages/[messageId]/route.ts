// DELETE /api/v1/channels/[id]/messages/[messageId]
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, notFoundResponse, forbiddenResponse, serverErrorResponse } from '@/lib/api-response';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; messageId: string } }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { id: channelId, messageId } = params;
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('mode') || 'recall'; // 'recall' (thu hồi) or 'me' (xóa phía mình)

      const message = await db.message.findUnique({
        where: { id: messageId },
        select: { id: true, senderId: true, metadata: true, channelId: true },
      });

      if (!message || message.channelId !== channelId) {
        return notFoundResponse('Tin nhắn không tồn tại');
      }

      if (mode === 'recall') {
        // Thu hồi (Recall): only sender can recall their own message
        if (message.senderId !== userId) {
          return forbiddenResponse('Bạn không thể thu hồi tin nhắn của người khác');
        }

        // Update the message to 'recalled'
        const updated = await db.message.update({
          where: { id: messageId },
          data: {
            content: 'Tin nhắn đã được thu hồi',
            contentType: 'recalled',
            fileUrl: null,
            fileName: null,
            fileSize: null,
            fileMimeType: null,
          },
        });
        return successResponse(updated);
      } else {
        // Xóa phía mình (Delete for me): add userId to deletedFor list in metadata
        let deletedFor: string[] = [];
        if (message.metadata) {
          try {
            const meta = JSON.parse(message.metadata);
            if (meta && typeof meta === 'object') {
              if (Array.isArray(meta.deletedFor)) {
                deletedFor = meta.deletedFor;
              } else if (meta.reactions) {
                // Preserve reactions metadata if any
              }
            }
          } catch {
            // ignore
          }
        }
        
        if (!deletedFor.includes(userId)) {
          deletedFor.push(userId);
        }

        // Parse existing metadata to keep reactions, only merge deletedFor
        let metaObj: Record<string, any> = {};
        if (message.metadata) {
          try {
            metaObj = JSON.parse(message.metadata);
          } catch {
            // ignore
          }
        }
        metaObj.deletedFor = deletedFor;

        const updated = await db.message.update({
          where: { id: messageId },
          data: {
            metadata: JSON.stringify(metaObj),
          },
        });
        return successResponse(updated);
      }
    } catch (error) {
      console.error('Delete message error:', error);
      return serverErrorResponse('Không thể xóa tin nhắn');
    }
  })(request);
}
