import { describe, it, expect } from 'vitest'

const BASE_URL = 'http://localhost:3000'

describe('Health Check', () => {
  it('GET /api/v1/health should return healthy status', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/health`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.status).toBe('healthy')
    expect(data.system).toBeDefined()
    expect(data.services).toBeDefined()
    expect(data.uptime).toBeDefined()
  })

  it('GET /api should return hello', async () => {
    const res = await fetch(`${BASE_URL}/api`)
    expect(res.status).toBe(200)
  })
})
