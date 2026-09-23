import { describe, it, expect, beforeEach } from '@jest/globals'
import { authFetch, clearCsrfToken } from '@/lib/api/client'

function mockResponse(body: object, status = 200) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  }
  return { ...res, clone: () => res } as unknown as Response
}

describe('authFetch', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    mockFetch.mockReset()
    clearCsrfToken()
  })

  function headersOf(call: number): Record<string, string> {
    const [, options] = mockFetch.mock.calls[call]
    return options?.headers as Record<string, string>
  }

  it('includes Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    expect(headersOf(0)['Content-Type']).toBe('application/json')
  })

  it('sends the session cookie rather than a bearer token', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    const [, options] = mockFetch.mock.calls[0]
    expect(options?.credentials).toBe('include')
    // The credential is an httpOnly cookie. Nothing readable should be
    // attached by hand — that is the whole point of dropping localStorage.
    expect(headersOf(0)['Authorization']).toBeUndefined()
  })

  it('does not fetch a CSRF token for a safe request', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('fetches and attaches a CSRF token for a mutating request', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ csrf_token: 'token-abc' }))
      .mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test', { method: 'POST' })

    expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/csrf$/)
    expect(headersOf(1)['X-CSRF-Token']).toBe('token-abc')
  })

  it('reuses a cached CSRF token across mutating requests', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ csrf_token: 'token-abc' }))
      .mockResolvedValueOnce(mockResponse({ ok: true }))
      .mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test', { method: 'POST' })
    await authFetch('/api/v1/other', { method: 'PATCH' })

    // csrf, POST, PATCH — the token is not refetched.
    expect(mockFetch).toHaveBeenCalledTimes(3)
    expect(headersOf(2)['X-CSRF-Token']).toBe('token-abc')
  })

  it('refetches the token once and retries when the server rejects it', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ csrf_token: 'stale' }))
      .mockResolvedValueOnce(mockResponse({ code: 'invalid_csrf_token' }, 403))
      .mockResolvedValueOnce(mockResponse({ csrf_token: 'fresh' }))
      .mockResolvedValueOnce(mockResponse({ ok: true }))

    const res = await authFetch('/api/v1/test', { method: 'POST' })

    expect(res.status).toBe(200)
    expect(headersOf(3)['X-CSRF-Token']).toBe('fresh')
  })

  it('does not retry a 403 that is not about CSRF', async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ csrf_token: 'token-abc' }))
      .mockResolvedValueOnce(mockResponse({ error: 'Forbidden' }, 403))

    const res = await authFetch('/api/v1/test', { method: 'POST' })

    expect(res.status).toBe(403)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('prepends API_URL to relative paths', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    expect(mockFetch.mock.calls[0][0]).toMatch(/^http.*\/api\/v1\/test$/)
  })

  it('uses absolute URL as-is', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('https://custom.api.com/endpoint')

    expect(mockFetch.mock.calls[0][0]).toBe('https://custom.api.com/endpoint')
  })
})
