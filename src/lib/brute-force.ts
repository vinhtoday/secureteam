// Brute Force Protection
// Tracks failed login attempts per IP and per email

interface FailedAttempt {
  count: number
  firstAttempt: number
  lastAttempt: number
  lockedUntil: number | null
}

const attemptStore = new Map<string, FailedAttempt>()

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 30 * 60 * 1000 // 30 minutes

// Cleanup every 10 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of attemptStore) {
    if (entry.lockedUntil && entry.lockedUntil < now) {
      attemptStore.delete(key)
    } else if (entry.lastAttempt + ATTEMPT_WINDOW < now) {
      attemptStore.delete(key)
    }
  }
}, 10 * 60 * 1000)

export interface BruteForceCheck {
  allowed: boolean
  remainingAttempts: number
  lockedUntil: number | null
}

export function checkBruteForce(identifier: string): BruteForceCheck {
  const now = Date.now()
  const entry = attemptStore.get(identifier)

  if (!entry) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null }
  }

  // Check if currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
    }
  }

  // Check if lockout expired
  if (entry.lockedUntil && entry.lockedUntil <= now) {
    attemptStore.delete(identifier)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null }
  }

  // Reset if outside attempt window
  if (now - entry.firstAttempt > ATTEMPT_WINDOW) {
    attemptStore.delete(identifier)
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS, lockedUntil: null }
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - entry.count)
  return { allowed: remaining > 0, remainingAttempts: remaining, lockedUntil: null }
}

export function recordFailedAttempt(identifier: string): BruteForceCheck {
  const now = Date.now()
  let entry = attemptStore.get(identifier)

  if (!entry || now - entry.firstAttempt > ATTEMPT_WINDOW) {
    entry = { count: 0, firstAttempt: now, lastAttempt: now, lockedUntil: null }
    attemptStore.set(identifier, entry)
  }

  entry.count++
  entry.lastAttempt = now

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION
    return {
      allowed: false,
      remainingAttempts: 0,
      lockedUntil: entry.lockedUntil,
    }
  }

  return checkBruteForce(identifier)
}

export function resetFailedAttempts(identifier: string): void {
  attemptStore.delete(identifier)
}
