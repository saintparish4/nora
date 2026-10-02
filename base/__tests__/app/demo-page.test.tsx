import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

let mockSearch = ''

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/demo',
  useSearchParams: () => new URLSearchParams(mockSearch),
  useParams: () => ({}),
}))

const mockUseAuth = jest.fn()
const mockEnterDemo = jest.fn()

jest.mock('@/lib/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

import DemoPage from '@/app/(auth)/demo/page'

describe('DemoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSearch = ''
    // Never settles by default, so the page stays in its opening state.
    mockEnterDemo.mockReturnValue(new Promise(() => {}))
    mockUseAuth.mockReturnValue({ user: null, loading: false, enterDemo: mockEnterDemo })
  })

  it('opens the demo as the medical assistant without being asked', async () => {
    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined))
    expect(mockEnterDemo).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toContain('medical assistant')
  })

  it('opens as the clinician for /demo?as=clinician', async () => {
    mockSearch = 'as=clinician'

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('clinician', undefined))
  })

  it('starts the walkthrough and lands on Today for /demo?tour=1', async () => {
    mockSearch = 'tour=1'
    window.sessionStorage.clear()

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('staff', '/dashboard'))
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

    expect(mockEnterDemo).toHaveBeenCalledWith('staff', undefined)
  })

  it('switches persona without asking when already in the demo practice', async () => {
    mockSearch = 'as=clinician'
    mockUseAuth.mockReturnValue({
      user: { id: 3, email: 'ma@nora.com', organization: { id: 1, name: 'Demo Family Medicine', timezone: 'America/New_York', demo: true } },
      loading: false,
      enterDemo: mockEnterDemo,
    })

    render(<DemoPage />)

    await waitFor(() => expect(mockEnterDemo).toHaveBeenCalledWith('clinician', undefined))
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
    mockEnterDemo.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    render(<DemoPage />)

    expect(await screen.findByText(/Could not reach the Nora API/)).toBeTruthy()
  })
})
