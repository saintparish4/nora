import { describe, it, expect, beforeEach } from '@jest/globals'
import { signup, login, logout, getCurrentUser, updateEmailPreferences } from '@/lib/api/auth'
import { setToken, removeToken, getToken } from '@/lib/api/client'

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

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function mockResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

describe('Auth API functions', () => {
  beforeEach(() => {
    localStorageMock.clear()
    mockFetch.mockReset()
  })

  describe('signup', () => {
    it('stores token and returns user on success', async () => {
      const responseData = {
        user: { id: 1, email: 'new@example.com' },
        token: 'jwt-signup-token',
        message: 'Account created successfully',
      }
      mockFetch.mockResolvedValueOnce(mockResponse(responseData, 201))

      const result = await signup('new@example.com', 'password123')

      expect(result.user.email).toBe('new@example.com')
      expect(result.token).toBe('jwt-signup-token')
      expect(getToken()).toBe('jwt-signup-token')
    })

    it('throws on error response', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ errors: ['Email has already been taken'] }, 422))

      await expect(signup('taken@example.com', 'password123')).rejects.toThrow('Email has already been taken')
    })
  })

  describe('login', () => {
    it('stores token and returns user on success', async () => {
      const responseData = {
        user: { id: 1, email: 'user@example.com' },
        token: 'jwt-login-token',
        message: 'Logged in successfully',
      }
      mockFetch.mockResolvedValueOnce(mockResponse(responseData))

      const result = await login('user@example.com', 'password123')

      expect(result.user.email).toBe('user@example.com')
      expect(getToken()).toBe('jwt-login-token')
    })

    it('throws on invalid credentials', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Invalid email or password' }, 401))

      await expect(login('user@example.com', 'wrong')).rejects.toThrow('Invalid email or password')
    })
  })

  describe('logout', () => {
    it('removes the stored token', async () => {
      setToken('some-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Logged out successfully' }))

      await logout()

      expect(getToken()).toBeNull()
    })

    it('skips the API call when no token is present', async () => {
      await logout()
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('returns user when token is valid', async () => {
      setToken('valid-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ user: { id: 1, email: 'me@example.com' } }))

      const user = await getCurrentUser()

      expect(user).not.toBeNull()
      expect(user!.email).toBe('me@example.com')
    })

    it('returns null and removes token on 401', async () => {
      setToken('expired-token')
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Unauthorized' }, 401))

      const user = await getCurrentUser()

      expect(user).toBeNull()
      expect(getToken()).toBeNull()
    })

    it('returns null when no token is stored', async () => {
      const user = await getCurrentUser()

      expect(user).toBeNull()
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns null and removes token on network error', async () => {
      setToken('valid-token')
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const user = await getCurrentUser()

      expect(user).toBeNull()
      expect(getToken()).toBeNull()
    })
  })

  describe('updateEmailPreferences', () => {
    it('returns success message on valid update', async () => {
      setToken('valid-token')
      mockFetch.mockResolvedValueOnce(
        mockResponse({ message: 'Preferences updated successfully' })
      )

      const result = await updateEmailPreferences({ booking_confirmations: false })

      expect(result.message).toBe('Preferences updated successfully')
    })

    it('throws on failure', async () => {
      setToken('valid-token')
      mockFetch.mockResolvedValueOnce(
        mockResponse({ error: 'Failed to update preferences' }, 422)
      )

      await expect(
        updateEmailPreferences({ booking_confirmations: false })
      ).rejects.toThrow('Failed to update preferences')
    })
  })
})
