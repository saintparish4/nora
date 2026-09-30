import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  addEvidence,
  getPriorAuthorizations,
  reviewEvidence,
  reviewRequirement,
  startExtraction,
} from '@/lib/api/prior-authorizations'
import { uploadChartDocument, getPatients } from '@/lib/api/workspace'
import { clearCsrfToken } from '@/lib/api/client'
import { PriorAuthorizationDetailSchema } from '@/lib/api/schemas'
import { priorAuthorizationFixture } from '../../fixtures/prior-authorization'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function mockResponse(body: object, status = 200) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  }
  return { ...res, clone: () => res } as unknown as Response
}

function mockCsrf() {
  mockFetch.mockResolvedValueOnce(mockResponse({ csrf_token: 'csrf-token' }))
}

function lastCall() {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]
  return { url: String(url), init: init as RequestInit & { headers: Record<string, string> } }
}

describe('prior authorization API', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearCsrfToken()
  })

  it('the fixture matches the response contract', () => {
    expect(() => PriorAuthorizationDetailSchema.parse(priorAuthorizationFixture())).not.toThrow()
  })

  it('sends status filters as an array parameter', async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ prior_authorizations: [], meta: { page: 1, per_page: 25, total: 0, total_pages: 0 } })
    )
    await getPriorAuthorizations({ status: ['submitted', 'payer_pending'], page: 2 })
    const { url } = lastCall()
    expect(url).toContain('status%5B%5D=submitted&status%5B%5D=payer_pending')
    expect(url).toContain('page=2')
  })

  it('patches a requirement with its status and note', async () => {
    mockCsrf()
    mockFetch.mockResolvedValueOnce(mockResponse({ prior_authorization: priorAuthorizationFixture() }))
    const pa = await reviewRequirement(12, 'not_applicable', 'BMI over 30')
    const { url, init } = lastCall()
    expect(url).toMatch(/\/api\/v1\/authorization_requirements\/12$/)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ status: 'not_applicable', note: 'BMI over 30' })
    expect(init.headers['X-CSRF-Token']).toBe('csrf-token')
    expect(pa.id).toBe(7)
  })

  it('verifies evidence with the review parameter', async () => {
    mockCsrf()
    mockFetch.mockResolvedValueOnce(mockResponse({ prior_authorization: priorAuthorizationFixture() }))
    await reviewEvidence(31, 'verify')
    expect(JSON.parse(String(lastCall().init.body))).toEqual({ review: 'verify' })
  })

  it("surfaces the API's own reason when a rule refuses the action", async () => {
    mockCsrf()
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: 'That text does not appear in Office visit. Copy it exactly from the document.' }, 422)
    )
    await expect(addEvidence(12, 41, 'made up')).rejects.toThrow('That text does not appear in Office visit')
  })

  it('surfaces a conflict when extraction is already running', async () => {
    mockCsrf()
    mockFetch.mockResolvedValueOnce(mockResponse({ error: 'Evidence extraction is already running.' }, 422))
    await expect(startExtraction(7)).rejects.toThrow('already running')
  })
})

describe('workspace API', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    clearCsrfToken()
  })

  it('uploads a file as multipart without a JSON content type', async () => {
    mockCsrf()
    mockFetch.mockResolvedValueOnce(
      mockResponse({
        chart_document: {
          id: 1, patient_id: 3, kind: 'office_note', title: 'note.txt', occurred_on: null, source: 'upload',
          original_filename: 'note.txt', length: 8, uploaded_by: { id: 1, name: 'Jordan Blake', email: 'j@example.com', role: 'staff' },
          created_at: '2026-09-30T12:00:00Z', body: 'BMI 31.0',
        },
      }, 201)
    )
    const file = new File(['BMI 31.0'], 'note.txt', { type: 'text/plain' })
    const doc = await uploadChartDocument(3, { kind: 'office_note' }, file)

    const { init } = lastCall()
    expect(init.body).toBeInstanceOf(FormData)
    expect(init.headers['Content-Type']).toBeUndefined()
    expect((init.body as FormData).get('kind')).toBe('office_note')
    expect(doc.source).toBe('upload')
  })

  it('omits empty search parameters', async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ patients: [], meta: { page: 1, per_page: 25, total: 0, total_pages: 0 } }))
    await getPatients({ q: '', page: 1 })
    expect(lastCall().url).toMatch(/\/api\/v1\/patients\?page=1$/)
  })
})
