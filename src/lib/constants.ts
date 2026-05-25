// SecureTeam - Application Constants

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.LEADER]: 2,
  [ROLES.MEMBER]: 1,
};

export const ROLE_PERMISSIONS: Record<RoleName, {
  canManageUsers: boolean;
  canViewAllMessages: boolean;
  canManageChannels: boolean;
  canAudit: boolean;
  canExportData: boolean;
  canDeleteUsers: boolean;
  canManageRoles: boolean;
}> = {
  [ROLES.SUPER_ADMIN]: {
    canManageUsers: true,
    canViewAllMessages: true,
    canManageChannels: true,
    canAudit: true,
    canExportData: true,
    canDeleteUsers: true,
    canManageRoles: true,
  },
  [ROLES.ADMIN]: {
    canManageUsers: true,
    canViewAllMessages: true,
    canManageChannels: true,
    canAudit: true,
    canExportData: true,
    canDeleteUsers: false,
    canManageRoles: false,
  },
  [ROLES.LEADER]: {
    canManageUsers: false,
    canViewAllMessages: false,
    canManageChannels: true,
    canAudit: false,
    canExportData: false,
    canDeleteUsers: false,
    canManageRoles: false,
  },
  [ROLES.MEMBER]: {
    canManageUsers: false,
    canViewAllMessages: false,
    canManageChannels: false,
    canAudit: false,
    canExportData: false,
    canDeleteUsers: false,
    canManageRoles: false,
  },
};

export const CHANNEL_TYPES = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  DIRECT: 'direct',
} as const;

export type ChannelType = (typeof CHANNEL_TYPES)[keyof typeof CHANNEL_TYPES];

export const MESSAGE_TYPES = {
  TEXT: 'text',
  EMOJI: 'emoji',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

export const ERROR_CODES = {
  // Auth errors (1xxx)
  AUTH_INVALID_CREDENTIALS: { code: 1001, message: 'Invalid email or password' },
  AUTH_TOKEN_EXPIRED: { code: 1002, message: 'Token has expired' },
  AUTH_TOKEN_INVALID: { code: 1003, message: 'Invalid token' },
  AUTH_USER_NOT_FOUND: { code: 1004, message: 'User not found' },
  AUTH_USER_INACTIVE: { code: 1005, message: 'Account is inactive' },
  AUTH_USER_LOCKED: { code: 1006, message: 'Account is locked' },
  AUTH_EMAIL_EXISTS: { code: 1007, message: 'Email already registered' },
  AUTH_PASSWORD_INVALID: { code: 1008, message: 'Current password is incorrect' },
  AUTH_2FA_REQUIRED: { code: 1009, message: 'Two-factor authentication required' },
  AUTH_2FA_INVALID: { code: 1010, message: 'Invalid 2FA code' },
  AUTH_2FA_NOT_ENABLED: { code: 1011, message: 'Two-factor authentication not enabled' },

  // Validation errors (2xxx)
  VALIDATION_ERROR: { code: 2001, message: 'Validation failed' },
  VALIDATION_EMAIL_FORMAT: { code: 2002, message: 'Invalid email format' },
  VALIDATION_PASSWORD_FORMAT: { code: 2003, message: 'Password must be at least 8 characters with uppercase, number, and special character' },
  VALIDATION_NAME_REQUIRED: { code: 2004, message: 'Name is required' },

  // Channel errors (3xxx)
  CHANNEL_NOT_FOUND: { code: 3001, message: 'Channel not found' },
  CHANNEL_ACCESS_DENIED: { code: 3002, message: 'You do not have access to this channel' },
  CHANNEL_ALREADY_EXISTS: { code: 3003, message: 'Channel with this name already exists' },
  CHANNEL_MEMBER_EXISTS: { code: 3004, message: 'User is already a member of this channel' },
  CHANNEL_CANNOT_LEAVE: { code: 3005, message: 'Cannot leave this channel' },

  // User errors (4xxx)
  USER_NOT_FOUND: { code: 4001, message: 'User not found' },
  USER_ALREADY_EXISTS: { code: 4002, message: 'User already exists' },
  USER_FORBIDDEN: { code: 4003, message: 'Access denied' },
  USER_CANNOT_SELF_DELETE: { code: 4004, message: 'Cannot delete your own account' },

  // Server errors (5xxx)
  SERVER_ERROR: { code: 5001, message: 'Internal server error' },
  NOT_FOUND: { code: 5002, message: 'Resource not found' },

  // Rate limiting (6xxx)
  RATE_LIMIT_EXCEEDED: { code: 6001, message: 'Too many requests. Please try again later.' },
} as const;

export const CHANNEL_MEMBER_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
} as const;

export const ONLINE_STATUS = {
  ONLINE: 'online',
  AWAY: 'away',
  BUSY: 'busy',
  OFFLINE: 'offline',
} as const;

export const ENCRYPTION_ALGORITHM = 'AES-256-GCM';
export const HMAC_ALGORITHM = 'SHA256';
export const ENCRYPTION_KEY_LENGTH = 32; // 256 bits

export const JWT_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
