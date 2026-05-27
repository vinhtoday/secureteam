import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Auth API Integration', () => {
  let authToken: string

  it('POST /api/v1/auth/register should create user', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Test User',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.data.user).toBeDefined()
  })

  it('POST /api/v1/auth/login should return tokens', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@secureteam.com',
        password: 'Admin@123456',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.data.accessToken).toBeDefined()
    authToken = data.data.accessToken
  })

  it('GET /api/v1/auth/me should return user profile', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.data.email).toBe('admin@secureteam.com')
  })

  it('GET /api/v1/auth/me should fail without token', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`)
    expect(res.status).toBe(401)
  })

  it('POST /api/v1/auth/login should fail with wrong password', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@secureteam.com',
        password: 'WrongPassword!',
      }),
    })
    expect(res.status).toBe(401)
  })
})
