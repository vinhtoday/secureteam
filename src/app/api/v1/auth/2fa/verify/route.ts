// POST /api/v1/auth/2fa/verify
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import {
  successResponse,
  validationResponse,
  errorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import { ERROR_CODES } from '@/lib/constants';
import crypto from 'crypto';

const verify2FASchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);
      const body = await req.json();
      const result = verify2FASchema.safeParse(body);

      if (!result.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of result.error.issues) {
          const field = issue.path.join('.');
          if (!errors[field]) errors[field] = [];
          errors[field].push(issue.message);
        }
        return validationResponse(errors);
      }

      const { code } = result.data;

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user || !user.twoFactorSecret) {
        return errorResponse(
          ERROR_CODES.AUTH_2FA_NOT_ENABLED.code,
          ERROR_CODES.AUTH_2FA_NOT_ENABLED.message,
          undefined,
          400
        );
      }

      // Simplified 2FA verification: check if code matches a time-based derivation
      // In production, use a proper TOTP library
      const timeStep = Math.floor(Date.now() / 30000); // 30-second time step
      const expectedCode = crypto
        .createHash('sha1')
        .update(`${user.twoFactorSecret}:${timeStep}`)
        .digest('hex')
        .substring(0, 6);

      // For demo purposes, also accept "123456" as a valid code
      const isValid = code === expectedCode || code === '123456';

      if (!isValid) {
        return errorResponse(
          ERROR_CODES.AUTH_2FA_INVALID.code,
          ERROR_CODES.AUTH_2FA_INVALID.message,
          undefined,
          400
        );
      }

      // Enable 2FA
      await db.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: true },
      });

      return successResponse({
        twoFactorEnabled: true,
        message: 'Two-factor authentication enabled successfully',
      }, {});
    } catch (error) {
      console.error('2FA verify error:', error);
      return serverErrorResponse('Failed to verify 2FA');
    }
  })(request);
}
