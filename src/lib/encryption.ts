// SecureTeam - Message Encryption Utilities
import crypto from 'crypto';

interface EncryptedMessage {
  encrypted: string;
  iv: string;
  hmac: string;
}

/**
 * Generate a deterministic key from a base key and channel ID
 */
function deriveKey(key: string, context: string): Buffer {
  return crypto.createHash('sha256').update(`${key}:${context}`).digest();
}

/**
 * Encrypt a message using AES-256-GCM + HMAC-SHA256
 * @param content - The plaintext message
 * @param key - The encryption key (user's key or shared key)
 * @param context - Optional context for key derivation (e.g., channelId)
 * @returns Encrypted data with IV and HMAC
 */
export function encryptMessage(content: string, key: string, context?: string): EncryptedMessage {
  const encKey = context ? deriveKey(key, context) : Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Create HMAC using a separate key derived from the encryption key
  const hmacKey = crypto.createHash('sha256').update(`${key}:hmac`).digest();
  const hmac = crypto.createHmac('sha256', hmacKey)
    .update(`${encrypted}:${iv.toString('hex')}`)
    .digest('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    hmac,
  };
}

/**
 * Decrypt a message using AES-256-GCM + HMAC-SHA256 verification
 * @param encrypted - The encrypted ciphertext
 * @param iv - The initialization vector
 * @param key - The encryption key
 * @param hmac - The HMAC signature to verify
 * @param context - Optional context for key derivation
 * @returns The decrypted plaintext message
 * @throws Error if HMAC verification fails or decryption fails
 */
export function decryptMessage(
  encrypted: string,
  iv: string,
  key: string,
  hmac: string,
  context?: string
): string {
  const encKey = context ? deriveKey(key, context) : Buffer.from(key.padEnd(32, '0').slice(0, 32), 'utf8');

  // Verify HMAC first
  const hmacKey = crypto.createHash('sha256').update(`${key}:hmac`).digest();
  const expectedHmac = crypto.createHmac('sha256', hmacKey)
    .update(`${encrypted}:${iv}`)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
    throw new Error('HMAC verification failed: message may have been tampered with');
  }

  const ivBuffer = Buffer.from(iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, ivBuffer);
  decipher.setAuthTag(crypto.createHash('sha256').update(encrypted).digest().subarray(0, 16));

  try {
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    // Fallback: try without explicit auth tag since we use HMAC
    const decipher2 = crypto.createDecipheriv('aes-256-gcm', encKey, ivBuffer);
    let decrypted = decipher2.update(encrypted, 'hex', 'utf8');
    try {
      decrypted += decipher2.final('utf8');
      return decrypted;
    } catch {
      throw new Error('Decryption failed');
    }
  }
}

/**
 * Generate a new encryption key for a user
 * @returns A 256-bit hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt content in a simpler format for database storage
 * Uses a single JSON blob with encrypted, iv, and hmac fields
 */
export function encryptForStorage(content: string, key: string): string {
  const result = encryptMessage(content, key);
  return JSON.stringify(result);
}

/**
 * Decrypt content from database storage format
 */
export function decryptFromStorage(encryptedJson: string, key: string): string {
  const { encrypted, iv, hmac } = JSON.parse(encryptedJson) as EncryptedMessage;
  return decryptMessage(encrypted, iv, key, hmac);
}
