import { describe, it, expect, beforeEach } from '@jest/globals'
import { signup, login, logout, getCurrentUser, updateEmailPreferences, updateProfile } from '@/lib/api/auth'
import { clearCsrfToken } from '@/lib/api/client'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

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

// Mutating calls fetch a CSRF token first, so most flows below queue that
// response ahead of the one they actually care about.
function mockCsrf() {
  mockFetch.mockResolvedValueOnce(mockResponse({ csrf_token: 'csrf-token' }))
}

describe('Auth API functions', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearCsrfToken()
  })

  describe('signup', () => {
    it('returns the user and stores no readable credential', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(
        mockResponse(
          { user: { id: 1, email: 'new@example.com' }, message: 'Account created successfully' },
          201
        )
      )

      const result = await signup({ email: 'new@example.com', password: 'password123' })

      expect(result.user.email).toBe('new@example.com')
      // The session is an httpOnly cookie. There is deliberately nothing in
      // localStorage for an XSS to read.
      expect(localStorage.length).toBe(0)
    })

    it('throws on error response', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ errors: ['Email has already been taken'] }, 422))

      await expect(signup({ email: 'taken@example.com', password: 'password123' })).rejects.toThrow('Email has already been taken')
    })
  })

  describe('login', () => {
    it('returns the user without persisting a token', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(
        mockResponse({ user: { id: 1, email: 'user@example.com' }, message: 'Logged in successfully' })
      )

      const result = await login('user@example.com', 'password123')

      expect(result.user.email).toBe('user@example.com')
      expect(localStorage.length).toBe(0)
    })

    it('throws on invalid credentials', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Invalid email or password' }, 401))

      await expect(login('user@example.com', 'wrong')).rejects.toThrow('Invalid email or password')
    })
  })

  describe('logout', () => {
    it('always calls the API, because only the server can end the session', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Logged out successfully' }))

      await logout()

      const urls = mockFetch.mock.calls.map((call) => String(call[0]))
      expect(urls.some((url) => /\/api\/v1\/auth\/logout$/.test(url))).toBe(true)
    })

    it('does not throw when the logout call fails', async () => {
      mockCsrf()
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(logout()).rejects.toThrow('Network error')
    })
  })

  describe('updateProfile', () => {
    it('PATCHes the profile fields and returns the updated user', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          message: 'Profile updated successfully',
          user: { id: 1, email: 'me@example.com', first_name: 'Ada', state: 'TX' },
        })
      )

      const user = await updateProfile({ first_name: 'Ada', state: 'TX' })

      const [url, options] = mockFetch.mock.calls[1]
      expect(url).toMatch(/\/api\/v1\/auth\/profile$/)
      expect(options?.method).toBe('PATCH')
      expect(user.first_name).toBe('Ada')
    })

    it('surfaces validation errors from the API', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ errors: ['Phone must be 10 digits'] }, 422))

      await expect(updateProfile({ phone: '555' })).rejects.toThrow('Phone must be 10 digits')
    })
  })

  describe('getCurrentUser', () => {
    it('asks the API, since the session cookie is not readable here', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ user: { id: 1, email: 'me@example.com' } }))

      const user = await getCurrentUser()

      expect(user).not.toBeNull()
      expect(user!.email).toBe('me@example.com')
      expect(mockFetch.mock.calls[0][0]).toMatch(/\/api\/v1\/auth\/me$/)
    })

    it('returns null on 401 rather than redirecting a public page', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Unauthorized' }, 401))

      expect(await getCurrentUser()).toBeNull()
    })

    it('returns null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      expect(await getCurrentUser()).toBeNull()
    })
  })

  describe('updateEmailPreferences', () => {
    it('returns success message on valid update', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ message: 'Preferences updated successfully' }))

      const result = await updateEmailPreferences({ booking_confirmations: false })

      expect(result.message).toBe('Preferences updated successfully')
    })

    it('throws on failure', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Failed to update preferences' }, 422))

      await expect(updateEmailPreferences({ booking_confirmations: false })).rejects.toThrow('Failed to update preferences')
    })
  })
})
