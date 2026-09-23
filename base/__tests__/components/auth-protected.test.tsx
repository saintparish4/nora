import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen, waitFor } from '@testing-library/react'

const mockPush = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// We mock useAuth directly so we can control loading/user state
const mockUseAuth = jest.fn()

jest.mock('@/lib/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

import { AuthProtected } from '@/components/dashboard/auth-protected'

describe('AuthProtected', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows loading state while auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true })

    render(
      <AuthProtected>
        <div>Protected Content</div>
      </AuthProtected>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()
    expect(screen.queryByText('Protected Content')).toBeNull()
  })

  it('renders children when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'user@example.com' }, loading: false })

    render(
      <AuthProtected>
        <div>Protected Content</div>
      </AuthProtected>
    )

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeTruthy()
    })
  })

  it('redirects to /login with a returnUrl when not authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false })
    window.history.replaceState({}, '', '/dashboard/appointments?filter=past')

    render(
      <AuthProtected>
        <div>Protected Content</div>
      </AuthProtected>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        '/login?returnUrl=%2Fdashboard%2Fappointments%3Ffilter%3Dpast'
      )
    })
    expect(screen.queryByText('Protected Content')).toBeNull()
  })
})
