// Mock the API module
jest.mock('@/lib/api', () => ({
  updateEmailPreferences: jest.fn(),
  getCurrentUser: jest.fn(),
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
}))

import { describe, it, beforeEach, expect, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import React from 'react'

// Import the mocked module to get references
import * as api from '@/lib/api'
import SettingsPage from '@/app/(protected)/settings/page'
import { AuthProvider } from '@/lib/authContext'

const mockGetCurrentUser = api.getCurrentUser as jest.MockedFunction<typeof api.getCurrentUser>
const mockUpdateEmailPreferences = api.updateEmailPreferences as jest.MockedFunction<typeof api.updateEmailPreferences>

// Create a custom render function that wraps with AuthProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      {ui}
    </AuthProvider>
  )
}

describe('Settings Page', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Set up default mock implementations
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      booking_confirmations: true,
      reminders_24h: true,
      cancellation_notices: true,
    } as never)
    
    // Set up default successful API call
    mockUpdateEmailPreferences.mockResolvedValue({ message: 'Preferences updated successfully' } as never)
  })

  it('renders settings page', async () => {
    renderWithProviders(<SettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeDefined()
    })
  })

  it('displays current preferences', async () => {
    renderWithProviders(<SettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Booking Confirmations')).toBeDefined()
    })
  })

  it('updates preferences on save', async () => {
    renderWithProviders(<SettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeDefined()
    })
    
    const saveButton = screen.getByText('Save Preferences')
    
    await act(async () => {
      fireEvent.click(saveButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Preferences saved successfully!')).toBeDefined()
    })
  })

  it('shows error message on API failure', async () => {
    // Mock updateEmailPreferences to reject with an error
    mockUpdateEmailPreferences.mockRejectedValueOnce(new Error('API Error'))
    
    renderWithProviders(<SettingsPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Save Preferences')).toBeDefined()
    })
    
    const saveButton = screen.getByText('Save Preferences')
    
    await act(async () => {
      fireEvent.click(saveButton)
    })
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeDefined()
    })
  })
})