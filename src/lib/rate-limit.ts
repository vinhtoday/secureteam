// Rate limiting for API routes
// In production, use Redis via ioredis for distributed rate limiting

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitOptions {
  windowMs?: number      // Time window in ms (default: 60000 = 1 min)
  maxRequests?: number   // Max requests per window (default: 100)
  keyGenerator?: (req: Request) => string  // Custom key (default: IP-based)
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  resetAt: number
  limit: number
}

export function rateLimit(options: RateLimitOptions = {}): RateLimitResult {
  const {
    windowMs = 60 * 1000,
    maxRequests = 100,
    keyGenerator,
  } = options

  // For server-side, use a fixed identifier
  const key = keyGenerator ? keyGenerator(new Request('internal')) : 'global'
  const now = Date.now()
  const resetAt = now + windowMs

  const entry = store.get(key)
  
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt })
    return { success: true, remaining: maxRequests - 1, resetAt, limit: maxRequests }
  }

  entry.count++
  
  if (entry.count > maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt, limit: maxRequests }
  }

  return { success: false, remaining: maxRequests - entry.count, resetAt: entry.resetAt, limit: maxRequests }
}

// Per-IP rate limiter for route handlers
export function checkRateLimit(
  ip: string,
  endpoint: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const key = `rl:${endpoint}:${ip}`
  return rateLimit({
    ...options,
    keyGenerator: () => key,
  })
}
