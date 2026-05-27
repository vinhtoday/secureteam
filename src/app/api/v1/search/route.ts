// GET /api/v1/search — Global search across messages, tasks, users
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, getUserId } from '@/lib/auth-middleware';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const { searchParams } = new URL(request.url);

      const query = searchParams.get('q') || '';
      const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
      const types = searchParams.get('types')?.split(',');

      if (!query.trim()) {
        return successResponse({ messages: [], tasks: [], users: [], totalResults: 0 });
      }

      const searchForMessages = !types || types.includes('messages');
      const searchForTasks = !types || types.includes('tasks');
      const searchForUsers = !types || types.includes('users');

      const [messages, tasks, users] = await Promise.all([
        searchForMessages
          ? db.message.findMany({
              where: {
                content: { contains: query },
                OR: [
                  { channel: { members: { some: { userId } } } },
                  { senderId: userId },
                ],
                contentType: 'text',
              },
              select: {
                id: true,
                content: true,
                contentType: true,
                createdAt: true,
                channelId: true,
                channel: { select: { id: true, name: true } },
                sender: { select: { id: true, name: true, avatar: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: limit,
            })
          : Promise.resolve([]),
        searchForTasks
          ? db.task.findMany({
              where: {
                isArchived: false,
                title: { contains: query },
                OR: [
                  { createdBy: userId },
                  { assignments: { some: { userId } } },
                ],
              },
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                dueDate: true,
                channelId: true,
                channel: { select: { id: true, name: true } },
              },
              orderBy: { updatedAt: 'desc' },
              take: limit,
            })
          : Promise.resolve([]),
        searchForUsers
          ? db.user.findMany({
              where: {
                isActive: true,
                OR: [
                  { name: { contains: query } },
                  { email: { contains: query } },
                ],
              },
              select: {
                id: true,
                name: true,
                avatar: true,
                email: true,
                onlineStatus: true,
                department: true,
              },
              orderBy: { name: 'asc' },
              take: limit,
            })
          : Promise.resolve([]),
      ]);

      return successResponse({
        messages,
        tasks,
        users,
        totalResults: messages.length + tasks.length + users.length,
      });
    } catch (error) {
      console.error('Search error:', error);
      return serverErrorResponse('Không thể tìm kiếm');
    }
  })(request);
}
