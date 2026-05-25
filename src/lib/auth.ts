// SecureTeam - Authentication Utilities
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN } from './constants';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'default-refresh-secret-change-in-production';

/**
 * Hash a password using bcrypt with 12 salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plain text password against a bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

/**
 * Generate a JWT access token
 */
export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

/**
 * Verify a JWT access token, returns payload or null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Generate a refresh token (random hex string)
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Sign a refresh token with JWT for verification
 */
export function signRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
  );
}

/**
 * Verify a refresh token, returns payload or null
 */
export function verifyRefreshToken(token: string): { userId: string; type: string } | null {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptAES(data: string, key: string): EncryptedData {
  const iv = crypto.randomBytes(12);
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptAES(encryptedData: string, iv: string, key: string, tag: string): string {
  const keyBuffer = Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  const ivBuffer = Buffer.from(iv, 'hex');
  const tagBuffer = Buffer.from(tag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a TOTP secret for 2FA
 */
export function generateTOTPSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

/**
 * Generate a 6-digit verification code for 2FA (simplified approach)
 */
export function generate2FACode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Hash a token for storage
 */
export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}
