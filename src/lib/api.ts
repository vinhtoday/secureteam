'use client'

// SecureTeam - API Client
// Handles auth headers, token refresh, and type-safe responses

interface ApiError {
  error: string
  message: string
  details?: Record<string, unknown>
}

interface ApiResponse<T> {
  data: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
    [key: string]: unknown
  }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken(): string | null {
  return accessToken
}

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }
  return headers
}

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const json = await res.json()
      if (json.data?.accessToken) {
        accessToken = json.data.accessToken
        return true
      }
    }
  } catch {
    // Refresh failed
  }
  return false
}

let isRefreshing = false
let refreshPromise: Promise<boolean> | null = null

async function ensureToken(): Promise<boolean> {
  if (!accessToken) return false

  if (isRefreshing && refreshPromise) {
    return refreshPromise
  }

  isRefreshing = true
  refreshPromise = refreshToken().finally(() => {
    isRefreshing = false
    refreshPromise = null
  })

  return refreshPromise
}

export class ApiClientError extends Error {
  error: string
  details?: Record<string, unknown>
  status: number

  constructor(errorObj: ApiError, status: number) {
    super(errorObj.message)
    this.error = errorObj.error
    this.message = errorObj.message
    this.details = errorObj.details
    this.status = status
    this.name = 'ApiClientError'
  }
}

async function request<T>(
  method: HttpMethod,
  url: string,
  body?: unknown,
  retries = 1
): Promise<ApiResponse<T>> {
  const options: RequestInit = {
    method,
    headers: getAuthHeaders(),
    credentials: 'include',
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  const res = await fetch(url, options)

  // Handle 401 - try refresh token
  if (res.status === 401 && retries > 0) {
    const refreshed = await ensureToken()
    if (refreshed) {
      return request(method, url, body, retries - 1)
    }
  }

  const json = await res.json()

  if (!res.ok) {
    throw new ApiClientError(json, res.status)
  }

  return json as ApiResponse<T>
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  delete: <T>(url: string) => request<T>('DELETE', url),
}
