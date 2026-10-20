import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { preloadRequest } from '@/lib/api/preload'
import { useMembers, usePatient, usePriorAuthorization, usePriorAuthorizationEvents, useTasks } from '@/lib/api/hooks'
import { priorAuthorizationFixture } from '../../fixtures/prior-authorization'

const PA = priorAuthorizationFixture()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function json(body: object) {
  const res = { ok: true, status: 200, json: () => Promise.resolve(body), headers: new Headers({ 'Content-Type': 'application/json' }) }
  return { ...res, clone: () => res } as unknown as Response
}

const BODIES: Array<[RegExp, object]> = [
  [/prior_authorizations\/\d+\/events/, { events: [] }],
  [/prior_authorizations\/\d+$/, { prior_authorization: PA }],
  [/tasks/, { tasks: [], meta: { page: 1, per_page: 25, total: 0, total_pages: 0 } }],
  [/organization\/members/, { members: [] }],
  [/patients\/\d+/, { patient: PA.patient, coverages: [], chart_documents: [], prior_authorizations: [] }],
]

const callsTo = (pattern: RegExp) => mockFetch.mock.calls.filter(([url]) => pattern.test(String(url))).length

// A fresh provider per test, like AccountCache gives each account.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
)

describe('preloadRequest', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockImplementation(async (url) => json(BODIES.find(([p]) => p.test(String(url)))?.[1] ?? {}))
  })

  it("hands its requests in flight to the request page's hooks, so mounting fetches nothing twice", async () => {
    const id = PA.id
    preloadRequest(id)

    // Mount straight away, as the demo does: the requests are still on the way.
    const { result } = renderHook(() => {
      const pa = usePriorAuthorization(id)
      usePriorAuthorizationEvents(id)
      useTasks({ prior_authorization_id: id, status: 'open' })
      useMembers()
      const patient = usePatient(pa.data?.patient.id ?? null)
      return { pa, patient }
    }, { wrapper })

    await waitFor(() => expect(result.current.patient.data?.patient.id).toBe(PA.patient.id))
    expect(result.current.pa.data?.id).toBe(id)
    expect(callsTo(/prior_authorizations\/\d+$/)).toBe(1)
    expect(callsTo(/events/)).toBe(1)
    expect(callsTo(/tasks/)).toBe(1)
    expect(callsTo(/members/)).toBe(1)
    expect(callsTo(/patients\/\d+/)).toBe(1)
  })

  it('asks for the right tasks, not every open task in the practice', async () => {
    preloadRequest(7)
    await waitFor(() => expect(callsTo(/tasks/)).toBe(1))

    const tasks = mockFetch.mock.calls.map(([url]) => String(url)).filter(u => u.includes('tasks'))
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toContain('prior_authorization_id=7')
  })
})
