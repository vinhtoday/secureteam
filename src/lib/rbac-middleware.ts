// SecureTeam - Role-Based Access Control Middleware
import { NextResponse } from 'next/server';
import type { AuthenticatedRequest } from './auth-middleware';
import { forbiddenResponse } from './api-response';
import { ROLES, ROLE_HIERARCHY, type RoleName } from './constants';

/**
 * Check if a user's role has the required minimum role level
 */
function hasMinimumRole(userRole: string, requiredRole: RoleName): boolean {
  const userLevel = ROLE_HIERARCHY[userRole as RoleName] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if a user's role matches any of the required roles
 */
function hasAnyRole(userRole: string, roles: RoleName[]): boolean {
  return roles.includes(userRole as RoleName);
}

/**
 * Require specific roles to access a route
 * Usage: requireRole(ROLES.ADMIN, ROLES.SUPER_ADMIN)
 */
export function requireRole(...roles: RoleName[]) {
  return (userRole: string): NextResponse | null => {
    if (!hasAnyRole(userRole, roles)) {
      return forbiddenResponse(`Required role: ${roles.join(' or ')}`);
    }
    return null;
  };
}

/**
 * Require at least the specified role level
 * Usage: requireMinimumRole(ROLES.ADMIN) - allows ADMIN and SUPER_ADMIN
 */
export function requireMinimumRole(role: RoleName) {
  return (userRole: string): NextResponse | null => {
    if (!hasMinimumRole(userRole, role)) {
      return forbiddenResponse(`Required minimum role: ${role}`);
    }
    return null;
  };
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(userRole: string): boolean {
  return hasMinimumRole(userRole, ROLES.ADMIN);
}

/**
 * Check if user can view all messages (audit capability)
 */
export function canViewAllMessages(userRole: string): boolean {
  return hasMinimumRole(userRole, ROLES.ADMIN);
}

/**
 * Check if user can manage channels
 */
export function canManageChannels(userRole: string): boolean {
  return hasMinimumRole(userRole, ROLES.LEADER);
}

/**
 * Check if user can perform audit actions
 */
export function canAudit(userRole: string): boolean {
  return hasMinimumRole(userRole, ROLES.ADMIN);
}

/**
 * Check if user can export data
 */
export function canExportData(userRole: string): boolean {
  return hasMinimumRole(userRole, ROLES.ADMIN);
}

/**
 * Check if user can delete other users (SUPER_ADMIN only)
 */
export function canDeleteUsers(userRole: string): boolean {
  return userRole === ROLES.SUPER_ADMIN;
}

/**
 * Validate channel membership
 */
export async function isChannelMember(userId: string, channelId: string): Promise<boolean> {
  const { db } = await import('./db');
  const membership = await db.channelMember.findUnique({
    where: {
      userId_channelId: { userId, channelId },
    },
  });
  return !!membership;
}

/**
 * Check if user is channel admin
 */
export async function isChannelAdmin(userId: string, channelId: string): Promise<boolean> {
  const { db } = await import('./db');
  const membership = await db.channelMember.findUnique({
    where: {
      userId_channelId: { userId, channelId },
    },
  });
  return membership?.role === 'admin';
}

/**
 * Get channel member role
 */
export async function getChannelMemberRole(userId: string, channelId: string): Promise<string | null> {
  const { db } = await import('./db');
  const membership = await db.channelMember.findUnique({
    where: {
      userId_channelId: { userId, channelId },
    },
    select: { role: true },
  });
  return membership?.role ?? null;
}
