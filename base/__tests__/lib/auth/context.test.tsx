import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/lib/auth/context'

// Track router.push calls
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
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock the API module
const mockLogin = jest.fn()
const mockSignup = jest.fn()
const mockLogout = jest.fn()
const mockGetCurrentUser = jest.fn()

jest.mock('@/lib/api', () => ({
  login: (...args: unknown[]) => mockLogin(...args),
  signup: (...args: unknown[]) => mockSignup(...args),
  logout: (...args: unknown[]) => mockLogout(...args),
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}))

function TestConsumer() {
  const { user, loading, login, signup, logout } = useAuth()

  if (loading) return <div>Loading...</div>

  return (
    <div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <button onClick={() => login('test@example.com', 'pass')}>Login</button>
      <button onClick={() => signup('new@example.com', 'pass')}>Signup</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCurrentUser.mockResolvedValue(null)
  })

  it('starts in loading state and resolves to no user', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByText('Loading...')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none')
    })
  })

  it('loads existing user on mount when getCurrentUser returns a user', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, email: 'existing@example.com' })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('existing@example.com')
    })
  })

  it('login sets user and redirects to /dashboard', async () => {
    mockLogin.mockResolvedValue({
      user: { id: 1, email: 'test@example.com' },
      token: 'tok',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('user')).toBeTruthy())

    await act(async () => {
      await userEvent.click(screen.getByText('Login'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('test@example.com')
    })
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('signup sets user and redirects to /dashboard', async () => {
    mockSignup.mockResolvedValue({
      user: { id: 2, email: 'new@example.com' },
      token: 'tok',
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => expect(screen.getByTestId('user')).toBeTruthy())

    await act(async () => {
      await userEvent.click(screen.getByText('Signup'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('new@example.com')
    })
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('logout clears user and redirects to /login', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 1, email: 'me@example.com' })
    mockLogout.mockResolvedValue(undefined)

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('me@example.com')
    })

    await act(async () => {
      await userEvent.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('none')
    })
    expect(mockPush).toHaveBeenCalledWith('/login')
  })

  it('throws when useAuth is used outside AuthProvider', () => {
    function Orphan() {
      useAuth()
      return null
    }

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within an AuthProvider')
    consoleSpy.mockRestore()
  })
})
