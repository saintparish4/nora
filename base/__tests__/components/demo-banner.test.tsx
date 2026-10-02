import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'

const mockUseAuth = jest.fn()

jest.mock('@/lib/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

import { DemoBanner } from '@/components/dashboard/demo-banner'

const demoUser = (role: string, first_name: string, last_name: string) => ({
  id: 1,
  email: 'someone@nora.com',
  first_name,
  last_name,
  role,
  organization: { id: 1, name: 'Demo Family Medicine', timezone: 'America/New_York', demo: true },
})

describe('DemoBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing in a real practice', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, email: 'a@example.com', role: 'staff', organization: { id: 2, name: 'Riverside', timezone: 'America/New_York' } },
    })

    const { container } = render(<DemoBanner />)

    expect(container.firstChild).toBeNull()
  })

  it('tells the medical assistant who they are and offers the clinician', () => {
    mockUseAuth.mockReturnValue({ user: demoUser('staff', 'Jordan', 'Blake') })

    render(<DemoBanner />)

    expect(screen.getByLabelText('Demo practice').textContent).toContain('You are Jordan Blake, the medical assistant.')
    expect(screen.getByLabelText('Demo practice').textContent).toContain('synthetic')
    expect(screen.getByRole('link', { name: 'Switch to the clinician' }).getAttribute('href')).toBe('/demo?as=clinician')
  })

  it('offers the walkthrough', () => {
    mockUseAuth.mockReturnValue({ user: demoUser('staff', 'Jordan', 'Blake') })

    render(<DemoBanner />)

    expect(screen.getByRole('link', { name: 'Watch the walkthrough' }).getAttribute('href')).toBe('/demo?tour=1')
  })

  it('offers the medical assistant to the clinician', () => {
    mockUseAuth.mockReturnValue({ user: demoUser('clinician', 'Avery', 'Chen') })

    render(<DemoBanner />)

    expect(screen.getByRole('link', { name: 'Switch to the medical assistant' }).getAttribute('href')).toBe('/demo?as=staff')
  })
})
