import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('Rate Limiting', () => {
  const testIp = '192.168.1.100'
  const testEndpoint = 'login'

  it('should allow requests under limit', () => {
    for (let i = 0; i < 50; i++) {
      const result = checkRateLimit(testIp, testEndpoint, { maxRequests: 100 })
      expect(result.success).toBe(true)
    }
  })

  it('should block requests over limit', () => {
    // Fill up to limit
    for (let i = 0; i < 10; i++) {
      checkRateLimit(testIp, testEndpoint, { maxRequests: 10 })
    }
    // Next request should be blocked
    const result = checkRateLimit(testIp, testEndpoint, { maxRequests: 10 })
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('should track remaining requests', () => {
    checkRateLimit(testIp, 'test-endpoint', { maxRequests: 5 })
    checkRateLimit(testIp, 'test-endpoint', { maxRequests: 5 })
    const result = checkRateLimit(testIp, 'test-endpoint', { maxRequests: 5 })
    expect(result.remaining).toBe(2)
  })

  it('should isolate by endpoint', () => {
    // Fill up one endpoint
    for (let i = 0; i < 10; i++) {
      checkRateLimit(testIp, 'endpoint-a', { maxRequests: 5 })
    }
    // Other endpoint should still be allowed
    const result = checkRateLimit(testIp, 'endpoint-b', { maxRequests: 5 })
    expect(result.success).toBe(true)
  })

  it('should isolate by IP', () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit('ip-a', 'test', { maxRequests: 5 })
    }
    const result = checkRateLimit('ip-b', 'test', { maxRequests: 5 })
    expect(result.success).toBe(true)
  })
})
