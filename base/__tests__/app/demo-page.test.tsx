import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

let mockSearch = ''
const mockPrefetch = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: mockPrefetch }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(mockSearch),
  useParams: () => ({}),
}))

const mockUseAuth = jest.fn()
const mockEnterDemo = jest.fn()
const mockWakeApi = jest.fn()
const mockAnsweredAgo = jest.fn()
const mockPreloadRequest = jest.fn()

jest.mock('@/lib/api/health', () => ({
  wakeApi: (options: unknown) => mockWakeApi(options),
  apiAnsweredAgo: () => mockAnsweredAgo(),
}))

jest.mock('@/lib/api/preload', () => ({
  preloadRequest: (id: number) => mockPreloadRequest(id),
  preloadToday: () => {},
}))

jest.mock('@/lib/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

import DemoPage from '@/app/(auth)/demo/page'

describe('DemoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = ''
    window.sessionStorage.clear()
    // Never settles by default, so the page stays in its opening state.
    mockEnterDemo.mockReturnValue(new Promise(() => {}))
    mockWakeApi.mockResolvedValue(200)
    mockAnsweredAgo.mockReturnValue(null)
    mockUseAuth.mockReturnValue({ user: null, loading: false, enterDemo: mockEnterDemo })
  })

  it('opens the demo as the medical assistant without being asked', async () => {
    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function)))
    expect(mockEnterDemo).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('log').textContent).toContain('nora demo --as medical-assistant')
    expect(screen.getByRole('log').textContent).toContain('API already awake')
  })

  it('waits for the API to wake before signing in, and shows each probe', async () => {
    let wake: (ms: number) => void = () => {}
    mockWakeApi.mockImplementation(({ onAttempt }) => {
      onAttempt({ attempt: 1, result: { ok: false, timedOut: true }, elapsedMs: 8000 })
      return new Promise(resolve => { wake = resolve })
    })

    render(<DemoPage />)

    const log = await screen.findByRole('log')
    await waitFor(() => expect(log.textContent).toContain('GET /up · no answer yet'))
    expect(mockEnterDemo).not.toHaveBeenCalled()

    wake(41_300)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function)))
    expect(log.textContent).toContain('API awake after 41.3s')
  })

  it("skips the wake-up when the landing page's probe was just answered", async () => {
    mockAnsweredAgo.mockReturnValue(2100)

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalled())
    expect(mockWakeApi).not.toHaveBeenCalled()
    expect(screen.getByRole('log').textContent).toContain('API awake (answered 2.1s ago)')
  })

  it("fetches the request page's code while waking, and its data as it signs in", async () => {
    mockEnterDemo.mockImplementation(async (_role, _dest, prepare) => {
      await prepare('/dashboard/prior-authorizations/2', {})
    })

    render(<DemoPage />)

    expect(mockPrefetch).toHaveBeenCalledWith('/dashboard/prior-authorizations/0', { kind: 'full' })
    await waitFor(() => expect(mockPreloadRequest).toHaveBeenCalledWith(2))
    const log = screen.getByRole('log')
    expect(log.textContent).toContain("signed in as the practice's medical assistant")
    expect(log.textContent).toContain('opening the request')
  })

  it('draws the request skeleton under the log for the walkthrough, which plays on that page', async () => {
    mockSearch = 'tour=1'
    window.sessionStorage.clear()

    const { container } = render(<DemoPage />)

    expect(container.querySelector('[data-screen="request"]')).toBeTruthy()
    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function)))
    window.sessionStorage.clear()
  })

  it('plays the walkthrough as the medical assistant even from ?as=clinician', async () => {
    mockSearch = 'as=clinician&tour=1'
    window.sessionStorage.clear()

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function)))
    window.sessionStorage.clear()
  })

  it('stops waking the API when the visitor leaves', async () => {
    mockWakeApi.mockReturnValue(new Promise(() => {}))

    const { unmount } = render(<DemoPage />)
    await waitFor(() => expect(mockWakeApi).toHaveBeenCalled())
    const { signal } = mockWakeApi.mock.calls[0][0] as { signal: AbortSignal }

    unmount()

    expect(signal.aborted).toBe(true)
  })

  it('opens as the clinician for /demo?as=clinician', async () => {
    mockSearch = 'as=clinician'

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('clinician', undefined, expect.any(Function)))
  })

  it('starts the walkthrough on the featured request for /demo?tour=1', async () => {
    mockSearch = 'tour=1'
    window.sessionStorage.clear()

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function)))
    expect(JSON.parse(window.sessionStorage.getItem('nora-demo-tour') ?? 'null')).toEqual({ step: 0, playing: true })
    window.sessionStorage.clear()
  })

  it('waits for the session check before opening', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, enterDemo: mockEnterDemo })

    render(<DemoPage />)

    expect(mockEnterDemo).not.toHaveBeenCalled()
  })

  it('asks first when the visitor is signed in to a real practice', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 9, email: 'owner@example.com', organization: { id: 4, name: 'Riverside Clinic', timezone: 'America/New_York' } },
      loading: false,
      enterDemo: mockEnterDemo,
    })

    render(<DemoPage />)

    expect(screen.getByText(/You are signed in to Riverside Clinic/)).toBeTruthy()
    expect(mockEnterDemo).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Open the demo' }))

    expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined, expect.any(Function))
  })

  it('switches persona without asking when already in the demo practice', async () => {
    mockSearch = 'as=clinician'
    mockUseAuth.mockReturnValue({
      user: { id: 3, email: 'ma@nora.com', organization: { id: 1, name: 'Demo Family Medicine', timezone: 'America/New_York', demo: true } },
      loading: false,
      enterDemo: mockEnterDemo,
    })

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('clinician', undefined, expect.any(Function)))
  })

  it("shows the API's reason when the demo is not offered, and retries on request", async () => {
    mockEnterDemo.mockRejectedValueOnce(new Error('The demo practice is not available on this server.'))

    render(<DemoPage />)

    expect((await screen.findByText('The demo practice is not available on this server.')).getAttribute('role')).toBe('alert')
    expect(screen.getByRole('link', { name: 'Sign in instead' }).getAttribute('href')).toBe('/login')

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(mockEnterDemo).toHaveBeenCalledTimes(2)
  })

  it('explains an unreachable API in plain words', async () => {
    mockWakeApi.mockRejectedValueOnce(new TypeError('The API did not answer'))

    render(<DemoPage />)

    expect(await screen.findByText(/Could not reach the Nora API/)).toBeTruthy()
    expect(screen.getByRole('log').textContent).toContain('gave up waiting for the API')
    expect(mockEnterDemo).not.toHaveBeenCalled()
  })
})
