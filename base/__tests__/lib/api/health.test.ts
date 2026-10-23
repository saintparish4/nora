import { describe, it, expect, beforeEach } from '@jest/globals'
import { probeApi, wakeApi, type WakeAttempt } from '@/lib/api/health'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const answer = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response

// Behaves like Render while it boots: holds the request until it is aborted.
const hang = (_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })

describe('probeApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('asks the health check, without a cookie', async () => {
    mockFetch.mockResolvedValueOnce(answer(200))

    expect(await probeApi()).toEqual({ ok: true, status: 200 })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('http://localhost:3006/up')
    expect((init as RequestInit).credentials).toBeUndefined()
  })

  it('reports an error status as not ready', async () => {
    mockFetch.mockResolvedValueOnce(answer(502))

    expect(await probeApi()).toEqual({ ok: false, status: 502, timedOut: false })
  })

  it('counts any answer from Rails below 500 as awake', async () => {
    mockFetch.mockResolvedValueOnce(answer(404))

    expect(await probeApi()).toEqual({ ok: true, status: 404 })
  })

  it('gives up on a probe that hangs', async () => {
    mockFetch.mockImplementationOnce(hang)

    expect(await probeApi(10)).toEqual({ ok: false, timedOut: true })
  })
})

describe('wakeApi', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('keeps probing until the API answers, reporting each try', async () => {
    mockFetch
      .mockImplementationOnce(hang)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(answer(200))
    const attempts: WakeAttempt[] = []

    await wakeApi({ attemptTimeoutMs: 10, retryDelayMs: 1, onAttempt: a => attempts.push(a) })

    expect(attempts.map(a => [a.attempt, a.result.ok])).toEqual([[1, false], [2, false], [3, true]])
    expect(attempts[0].result).toMatchObject({ timedOut: true })
  })

  it('rejects like an unreachable fetch once it has waited long enough', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(wakeApi({ retryDelayMs: 1, giveUpAfterMs: 0 })).rejects.toBeInstanceOf(TypeError)
  })

  it('stops when the caller does', async () => {
    mockFetch.mockImplementation(hang)
    const controller = new AbortController()
    const waiting = wakeApi({ signal: controller.signal })

    controller.abort()

    await expect(waiting).rejects.toMatchObject({ name: 'AbortError' })
  })
})
