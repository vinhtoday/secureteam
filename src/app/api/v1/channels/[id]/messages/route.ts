// GET /api/v1/channels/[id]/messages - Get messages
// POST /api/v1/channels/[id]/messages - Send message
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { isChannelMember } from '@/lib/rbac-middleware';
import {
  paginatedResponse,
  successResponse,
  forbiddenResponse,
  notFoundResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/lib/constants';

// GET messages
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;
      const { searchParams } = new URL(request.url);

      // Check membership
      const isMember = await isChannelMember(userId, channelId);
      if (!isMember) {
        return forbiddenResponse('You do not have access to this channel');
      }

      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10))
      );
      const before = searchParams.get('before');

      // Build where clause
      const where: Record<string, unknown> = { channelId };
      if (before) {
        where.createdAt = { lt: new Date(before) };
      }

      // Get total count
      const total = await db.message.count({ where: { channelId } });

      // Get messages
      const messages = await db.message.findMany({
        where,
        select: {
          id: true,
          content: true,
          contentType: true,
          createdAt: true,
          updatedAt: true,
          isPinned: true,
          isEdited: true,
          editedAt: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          fileMimeType: true,
          metadata: true,
          replyToId: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              onlineStatus: true,
              isBot: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              sender: {
                select: { id: true, name: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });

      // Filter out messages that are deleted for the current user
      const visibleMessages = messages.filter((msg) => {
        if (!msg.metadata) return true;
        try {
          const meta = JSON.parse(msg.metadata);
          if (meta && Array.isArray(meta.deletedFor) && meta.deletedFor.includes(userId)) {
            return false;
          }
        } catch {
          // ignore parsing error
        }
        return true;
      });

      return paginatedResponse(visibleMessages.reverse(), page, limit, total);
    } catch (error) {
      console.error('Get messages error:', error);
      return serverErrorResponse('Failed to get messages');
    }
  })(request, context);
}

// POST message
const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(10000),
  contentType: z.enum(['text', 'emoji', 'file', 'system']).default('text'),
  replyToId: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSize: z.number().optional(),
  metadata: z.string().optional(),
});

export { POST };

async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const params = await context.params;
      const channelId = params.id;

      // Check membership
      const isMember = await isChannelMember(userId, channelId);
      if (!isMember) {
        return forbiddenResponse('You do not have access to this channel');
      }

      // Check if channel exists
      const channel = await db.channel.findUnique({
        where: { id: channelId },
        select: { id: true },
      });
      if (!channel) {
        return notFoundResponse('Channel not found');
      }

      const body = await req.json();
      const result = sendMessageSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const {
        content,
        contentType,
        replyToId,
        fileUrl,
        fileName,
        fileSize,
        metadata,
      } = result.data;

      // Verify replyTo message exists in same channel
      if (replyToId) {
        const replyMessage = await db.message.findUnique({
          where: { id: replyToId },
        });
        if (!replyMessage || replyMessage.channelId !== channelId) {
          return notFoundResponse('Reply message not found');
        }
      }

      // Create message
      const message = await db.message.create({
        data: {
          channelId,
          senderId: userId,
          content,
          contentType,
          replyToId,
          fileUrl,
          fileName,
          fileSize,
          fileMimeType: metadata ? undefined : undefined,
          metadata,
        },
        select: {
          id: true,
          content: true,
          contentType: true,
          createdAt: true,
          isPinned: true,
          isEdited: true,
          fileUrl: true,
          fileName: true,
          fileSize: true,
          replyToId: true,
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
              onlineStatus: true,
              isBot: true,
            },
          },
          replyTo: replyToId
            ? {
                select: {
                  id: true,
                  content: true,
                  sender: {
                    select: { id: true, name: true, avatar: true },
                  },
                },
              }
            : undefined,
        },
      });

      // Note: Socket.io event emission is handled by the chat-service
      // In a production app, we'd notify the socket service via an event bus

      return successResponse(message, {}, 201);
    } catch (error) {
      console.error('Send message error:', error);
      return serverErrorResponse('Failed to send message');
    }
  })(request, context);
}
