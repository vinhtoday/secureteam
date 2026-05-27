import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { hashPassword, comparePassword, generateAccessToken, verifyAccessToken } from '@/lib/auth'
import { checkBruteForce, recordFailedAttempt, resetFailedAttempts, MAX_ATTEMPTS } from '@/lib/brute-force'

describe('Auth - Password Hashing', () => {
  it('should hash a password', async () => {
    const hash = await hashPassword('TestPassword123!')
    expect(hash).toBeDefined()
    expect(hash).not.toBe('TestPassword123!')
    expect(hash.length).toBeGreaterThan(20)
  })

  it('should compare correct password', async () => {
    const hash = await hashPassword('TestPassword123!')
    const isMatch = await comparePassword('TestPassword123!', hash)
    expect(isMatch).toBe(true)
  })

  it('should reject incorrect password', async () => {
    const hash = await hashPassword('TestPassword123!')
    const isMatch = await comparePassword('WrongPassword!', hash)
    expect(isMatch).toBe(false)
  })

  it('should produce different hashes for same password', async () => {
    const hash1 = await hashPassword('SamePassword')
    const hash2 = await hashPassword('SamePassword')
    expect(hash1).not.toBe(hash2)
  })
})

describe('Auth - JWT Tokens', () => {
  const testPayload = {
    userId: 'test-user-id',
    email: 'test@example.com',
    roleId: 'role-id',
    roleName: 'MEMBER',
  }

  it('should generate a valid access token', () => {
    const token = generateAccessToken(testPayload)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('should verify a valid token', () => {
    const token = generateAccessToken(testPayload)
    const decoded = verifyAccessToken(token)
    expect(decoded).toBeDefined()
    expect(decoded.userId).toBe(testPayload.userId)
    expect(decoded.email).toBe(testPayload.email)
    expect(decoded.roleName).toBe(testPayload.roleName)
  })

  it('should reject an invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow()
  })

  it('should reject an expired token', () => {
    // Create token with very short expiry
    const token = generateAccessToken(testPayload, '1ms')
    // Wait for expiry
    return new Promise(resolve => {
      setTimeout(() => {
        expect(() => verifyAccessToken(token)).toThrow()
        resolve(undefined)
      }, 50)
    })
  })
})

describe('Brute Force Protection', () => {
  const testId = 'test@example.com'

  afterEach(() => {
    resetFailedAttempts(testId)
  })

  it('should allow first attempts', () => {
    const result = checkBruteForce(testId)
    expect(result.allowed).toBe(true)
    expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
  })

  it('should decrement remaining attempts', () => {
    recordFailedAttempt(testId)
    const result = checkBruteForce(testId)
    expect(result.allowed).toBe(true)
    expect(result.remainingAttempts).toBe(MAX_ATTEMPTS - 1)
  })

  it('should lock after max attempts', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      recordFailedAttempt(testId)
    }
    const result = checkBruteForce(testId)
    expect(result.allowed).toBe(false)
    expect(result.remainingAttempts).toBe(0)
    expect(result.lockedUntil).not.toBeNull()
  })

  it('should reset on successful login', () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt(testId)
    }
    resetFailedAttempts(testId)
    const result = checkBruteForce(testId)
    expect(result.allowed).toBe(true)
    expect(result.remainingAttempts).toBe(MAX_ATTEMPTS)
  })
})
