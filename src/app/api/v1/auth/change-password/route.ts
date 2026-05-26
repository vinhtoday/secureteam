// POST /api/v1/auth/change-password
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { comparePassword, hashPassword } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { ERROR_CODES } from '@/lib/constants';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = changePasswordSchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { currentPassword, newPassword } = result.data;

      // Get user with password hash
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return serverErrorResponse('User not found');
      }

      // Verify current password
      const isValid = await comparePassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return errorResponse(
          ERROR_CODES.AUTH_PASSWORD_INVALID.code,
          ERROR_CODES.AUTH_PASSWORD_INVALID.message,
          undefined,
          400
        );
      }

      // Hash and update password
      const newHash = await hashPassword(newPassword);
      await db.user.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      });

      // Delete all sessions (force re-login on all devices)
      await db.session.deleteMany({ where: { userId } });

      return successResponse({ message: 'Password changed successfully' }, {});
    } catch (error) {
      console.error('Change password error:', error);
      return serverErrorResponse('Failed to change password');
    }
  })(request);
}
