// POST /api/v1/auth/2fa/setup
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/auth-middleware';
import { getUserId } from '@/lib/auth-middleware';
import { generateTOTPSecret } from '@/lib/auth';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  return withAuth(async (req) => {
    try {
      const userId = getUserId(req);

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user) {
        return serverErrorResponse('User not found');
      }

      // Generate new TOTP secret
      const secret = generateTOTPSecret();

      // Store secret (not yet enabled)
      await db.user.update({
        where: { id: userId },
        data: { twoFactorSecret: secret },
      });

      // Return QR code data as base64-encoded text
      // In production, this would generate a proper QR code image
      const otpAuthUrl = `otpauth://totp/SecureTeam:${userId}?secret=${secret}&issuer=SecureTeam`;
      const qrData = Buffer.from(otpAuthUrl).toString('base64');

      return successResponse({
        secret,
        qrData,
        message: 'Scan the QR code with your authenticator app, then verify with POST /api/v1/auth/2fa/verify',
      }, {});
    } catch (error) {
      console.error('2FA setup error:', error);
      return serverErrorResponse('Failed to setup 2FA');
    }
  })(request);
}
