// SecureTeam - Notification Helper
import { db } from '@/lib/db';

export interface CreateNotificationInput {
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(input: CreateNotificationInput) {
  return db.notification.create({
    data: {
      recipientId: input.recipientId,
      senderId: input.senderId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

/**
 * Create notifications for multiple recipients (e.g. task mention in a channel)
 */
export async function createBulkNotifications(
  inputs: CreateNotificationInput[]
) {
  if (inputs.length === 0) return [];
  return db.notification.createMany({
    data: inputs.map((input) => ({
      recipientId: input.recipientId,
      senderId: input.senderId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })),
  });
}

/**
 * Notify users about a task assignment
 */
export async function notifyTaskAssigned(taskId: string, taskTitle: string, recipientIds: string[], senderId: string) {
  const inputs: CreateNotificationInput[] = recipientIds.map((recipientId) => ({
    recipientId,
    senderId,
    type: 'task_assigned',
    title: 'Bạn được giao một công việc mới',
    body: `"${taskTitle}" đã được giao cho bạn`,
    link: `/tasks/${taskId}`,
    metadata: { taskId },
  }));
  return createBulkNotifications(inputs);
}

/**
 * Notify users about a task update
 */
export async function notifyTaskUpdated(
  taskId: string,
  taskTitle: string,
  recipientIds: string[],
  senderId: string,
  changes: string
) {
  const inputs: CreateNotificationInput[] = recipientIds.map((recipientId) => ({
    recipientId,
    senderId,
    type: 'task_updated',
    title: 'Công việc đã được cập nhật',
    body: `"${taskTitle}" - ${changes}`,
    link: `/tasks/${taskId}`,
    metadata: { taskId },
  }));
  return createBulkNotifications(inputs);
}

/**
 * Notify a user about a task comment
 */
export async function notifyTaskCommented(
  taskId: string,
  taskTitle: string,
  recipientId: string,
  senderId: string,
  commentPreview: string
) {
  return createNotification({
    recipientId,
    senderId,
    type: 'task_commented',
    title: 'Bình luận mới trong công việc',
    body: `"${taskTitle}" - ${commentPreview.substring(0, 100)}`,
    link: `/tasks/${taskId}`,
    metadata: { taskId },
  });
}

/**
 * Notify users about a task mention
 */
export async function notifyTaskMention(
  taskId: string,
  taskTitle: string,
  recipientId: string,
  senderId: string
) {
  return createNotification({
    recipientId,
    senderId,
    type: 'task_mention',
    title: 'Bạn được nhắc đến trong công việc',
    body: `"${taskTitle}"`,
    link: `/tasks/${taskId}`,
    metadata: { taskId },
  });
}
