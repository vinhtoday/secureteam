import { describe, it, expect } from 'vitest'
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationResponse,
  serverErrorResponse,
} from '@/lib/api-response'

describe('API Response Helpers', () => {
  it('successResponse returns 200 with data', () => {
    const response = successResponse({ id: '1', name: 'Test' })
    expect(response.status).toBe(200)
  })

  it('successResponse can return custom status', () => {
    const response = successResponse({ id: '1' }, {}, 201)
    expect(response.status).toBe(201)
  })

  it('errorResponse returns 400', () => {
    const response = errorResponse('TEST_ERROR', 'Test error message')
    expect(response.status).toBe(400)
  })

  it('errorResponse can return custom status', () => {
    const response = errorResponse('TEST_ERROR', 'Not found', undefined, 404)
    expect(response.status).toBe(404)
  })

  it('paginatedResponse returns 200 with pagination', () => {
    const response = paginatedResponse([{ id: '1' }], 1, 10, 100)
    expect(response.status).toBe(200)
  })

  it('notFoundResponse returns 404', () => {
    const response = notFoundResponse('Not found')
    expect(response.status).toBe(404)
  })

  it('unauthorizedResponse returns 401', () => {
    const response = unauthorizedResponse()
    expect(response.status).toBe(401)
  })

  it('forbiddenResponse returns 403', () => {
    const response = forbiddenResponse('Access denied')
    expect(response.status).toBe(403)
  })

  it('validationResponse returns 422', () => {
    const response = validationResponse({ field: ['Error'] })
    expect(response.status).toBe(422)
  })

  it('serverErrorResponse returns 500', () => {
    const response = serverErrorResponse('Internal error')
    expect(response.status).toBe(500)
  })
})
