import { describe, it, expect, beforeEach } from '@jest/globals'
import { getCarePreferences, updateCarePreferences } from '@/lib/api/preferences'
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

const PREFS = {
  preferred_location: 'Austin, TX',
  preferred_times: ['morning'],
  insurance_info: 'Blue Cross PPO',
  provider_gender_preference: 'no_preference',
  language_preferences: ['English'],
}

describe('Care preferences API', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    // The CSRF token is cached module-wide; a stale one would eat the next
    // queued response.
    clearCsrfToken()
  })

  describe('getCarePreferences', () => {
    it('unwraps the care_preferences payload', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ care_preferences: PREFS }))

      const prefs = await getCarePreferences()

      expect(prefs.preferred_location).toBe('Austin, TX')
      expect(prefs.preferred_times).toEqual(['morning'])
    })

    it('accepts the nulls a patient with no saved preferences gets back', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          care_preferences: {
            preferred_location: null,
            preferred_times: [],
            insurance_info: null,
            provider_gender_preference: null,
            language_preferences: [],
          },
        })
      )

      const prefs = await getCarePreferences()

      expect(prefs.preferred_location).toBeNull()
      expect(prefs.preferred_times).toEqual([])
    })

    it('throws on a failed request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({}, 500))

      await expect(getCarePreferences()).rejects.toThrow(
        'Failed to fetch care preferences'
      )
    })
  })

  describe('updateCarePreferences', () => {
    // A mutating request fetches a CSRF token first, so the real response is
    // the second one queued.
    function mockCsrf() {
      mockFetch.mockResolvedValueOnce(mockResponse({ csrf_token: 'csrf-token' }))
    }

    it('PATCHes the preferences and returns the saved copy', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(mockResponse({ care_preferences: PREFS }))

      const prefs = await updateCarePreferences({ preferred_location: 'Austin, TX' })

      const [url, options] = mockFetch.mock.calls[1]
      expect(url).toMatch(/\/api\/v1\/care-preferences$/)
      expect(options?.method).toBe('PATCH')
      expect(JSON.parse(options?.body as string)).toEqual({
        preferred_location: 'Austin, TX',
      })
      expect(prefs.preferred_location).toBe('Austin, TX')
    })

    it('surfaces validation errors', async () => {
      mockCsrf()
      mockFetch.mockResolvedValueOnce(
        mockResponse({ errors: ['Preferred location is invalid'] }, 422)
      )

      await expect(
        updateCarePreferences({ preferred_location: '???' })
      ).rejects.toThrow('Preferred location is invalid')
    })
  })
})
