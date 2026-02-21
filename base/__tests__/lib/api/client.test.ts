import { describe, it, expect, beforeEach } from '@jest/globals'
import { getToken, setToken, removeToken, authFetch } from '@/lib/api/client'

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

function mockResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

describe('Token management', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('getToken returns null when no token is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken stores and getToken retrieves the token', () => {
    setToken('my-jwt-token')
    expect(getToken()).toBe('my-jwt-token')
  })

  it('removeToken clears the stored token', () => {
    setToken('my-jwt-token')
    removeToken()
    expect(getToken()).toBeNull()
  })
})

describe('authFetch', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  it('includes Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('includes Authorization header when token is present', async () => {
    setToken('test-token')
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-token')
  })

  it('omits Authorization header when no token is stored', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    const [, options] = mockFetch.mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['Authorization']).toBeUndefined()
  })

  it('prepends API_URL to relative paths', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('/api/v1/test')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toMatch(/^http.*\/api\/v1\/test$/)
  })

  it('uses absolute URL as-is', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ ok: true }))

    await authFetch('https://custom.api.com/endpoint')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://custom.api.com/endpoint')
  })
})
