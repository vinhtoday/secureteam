import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = 'http://localhost:3000'
let authToken: string

async function login() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@secureteam.com', password: 'Admin@123456' }),
  })
  const data = await res.json()
  return data.data.accessToken
}

describe('Channels API Integration', () => {
  beforeAll(async () => {
    authToken = await login()
  })

  it('GET /api/v1/channels should return channels list', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/channels`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.data)).toBe(true)
  })

  it('POST /api/v1/channels should create channel', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/channels`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `test-channel-${Date.now()}`,
        type: 'public',
        description: 'Test channel',
      }),
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
    expect(data.data.name).toBeDefined()
  })

  it('GET /api/v1/channels/:id should return channel detail', async () => {
    // First get channels list to find an ID
    const listRes = await fetch(`${BASE_URL}/api/v1/channels`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    const listData = await listRes.json()
    const channelId = listData.data[0]?.id
    expect(channelId).toBeDefined()

    const res = await fetch(`${BASE_URL}/api/v1/channels/${channelId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.data).toBeDefined()
  })
})
