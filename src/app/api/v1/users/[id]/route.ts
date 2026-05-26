// GET /api/v1/users/[id] - Get user profile
// PATCH /api/v1/users/[id] - Update user (Admin)
// DELETE /api/v1/users/[id] - Deactivate user (Super Admin)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { requireMinimumRole, requireRole } from '@/lib/rbac-middleware';
import { ROLES } from '@/lib/constants';
import {
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  nullResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// GET user profile
export async function GET(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      const params = await context.params;
      const userId = params.id;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          isActive: true,
          isEmailVerified: true,
          twoFactorEnabled: true,
          lastSeen: true,
          onlineStatus: true,
          createdAt: true,
          role: {
            select: { id: true, name: true, description: true },
          },
        },
      });

      if (!user) {
        return notFoundResponse('User not found');
      }

      return successResponse(user);
    } catch (error) {
      console.error('Get user error:', error);
      return serverErrorResponse('Failed to get user');
    }
  })(request, context);
}

// PATCH update user
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  roleId: z.string().optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export { PATCH };

async function PATCH(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      // Check ADMIN role
      const rbacCheck = requireMinimumRole(ROLES.ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      const params = await context.params;
      const userId = params.id;

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return notFoundResponse('User not found');
      }

      const body = await req.json();
      const result = updateUserSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { name, email, roleId, isActive, isLocked } = result.data;

      // Check email uniqueness if changing email
      if (email && email !== user.email) {
        const existingEmail = await db.user.findUnique({ where: { email } });
        if (existingEmail) {
          return forbiddenResponse('Email already in use');
        }
      }

      // Check role exists if changing role
      if (roleId) {
        const role = await db.role.findUnique({ where: { id: roleId } });
        if (!role) {
          return notFoundResponse('Role not found');
        }
      }

      // Update user
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(roleId && { roleId }),
          ...(isActive !== undefined && { isActive }),
          ...(isLocked !== undefined && { isLocked }),
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          bio: true,
          isActive: true,
          isLocked: true,
          createdAt: true,
          role: {
            select: { id: true, name: true },
          },
        },
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: getUserId(req),
          action: 'USER_UPDATE',
          target: userId,
          details: JSON.stringify(result.data),
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        },
      });

      return successResponse(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      return serverErrorResponse('Failed to update user');
    }
  })(request, context);
}

// DELETE deactivate user
export { DELETE };

async function DELETE(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  return withAuth(async (req) => {
    try {
      // Check SUPER_ADMIN role
      const rbacCheck = requireRole(ROLES.SUPER_ADMIN)(req.user.roleName);
      if (rbacCheck) return rbacCheck;

      const params = await context.params;
      const userId = params.id;
      const currentUserId = getUserId(req);

      // Can't delete yourself
      if (userId === currentUserId) {
        return forbiddenResponse('Cannot delete your own account');
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return notFoundResponse('User not found');
      }

      // Deactivate user
      await db.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      // Delete user sessions
      await db.session.deleteMany({ where: { userId } });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: currentUserId,
          action: 'USER_DEACTIVATE',
          target: userId,
          details: `Deactivated user ${user.email}`,
          ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        },
      });

      return nullResponse();
    } catch (error) {
      console.error('Delete user error:', error);
      return serverErrorResponse('Failed to delete user');
    }
  })(request, context);
}
