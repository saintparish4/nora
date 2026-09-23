import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'

import { RecommendationCard } from '@/components/chat/recommendation-card'
import type { SymptomAnalysis, ChatProvider } from '@/types'

/**
 * These cover the two states where rendering the card like an ordinary
 * recommendation would be actively misleading: an emergency, and an analysis
 * that never ran. The backend escalates in both cases; the UI has to say so.
 */

const baseAnalysis: SymptomAnalysis = {
  specialty: 'dermatology',
  urgency: 'routine',
  reasoning: 'Acne is a common skin condition.',
  keywords: ['acne'],
  red_flags: [],
  specialty_name: 'Dermatology',
  urgency_details: {
    priority: 1,
    color: 'green',
    message: 'Schedule within 1-2 weeks',
  },
}

function renderCard(analysis: SymptomAnalysis, providers: ChatProvider[] = []) {
  return render(
    <RecommendationCard
      analysis={analysis}
      providers={providers}
      onBook={jest.fn()}
    />
  )
}

const SAFETY_NET = /treat it as an emergency and call 911/i

describe('RecommendationCard', () => {
  describe('a routine recommendation', () => {
    it('renders the specialty and urgency', () => {
      renderCard(baseAnalysis)

      expect(screen.getByText('Dermatology')).toBeTruthy()
      expect(screen.getByText('Routine')).toBeTruthy()
      expect(screen.getByText('Recommendation')).toBeTruthy()
    })

    it('still carries safety-netting advice', () => {
      const { container } = renderCard(baseAnalysis)

      expect(container.textContent).toMatch(SAFETY_NET)
    })

    it('shows no alert banner', () => {
      renderCard(baseAnalysis)

      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  describe('an emergency', () => {
    const emergency: SymptomAnalysis = {
      ...baseAnalysis,
      specialty: 'emergency',
      specialty_name: 'Emergency Room',
      urgency: 'emergency',
      red_flags: ['Possible heart attack symptoms'],
      urgency_details: {
        priority: 3,
        color: 'red',
        message: 'Seek immediate medical attention',
      },
      triage_source: 'red_flag_rules',
      assessment_failed: false,
    }

    it('leads with an alert telling the patient to call 911', () => {
      renderCard(emergency)

      const alert = screen.getByRole('alert')
      expect(alert.textContent).toMatch(/seek emergency care now/i)
      expect(alert.textContent).toMatch(/911/)
    })

    it('surfaces the crisis line for self-harm', () => {
      renderCard(emergency)

      expect(screen.getByRole('alert').textContent).toMatch(/988/)
    })

    it('names the red flags that fired', () => {
      renderCard(emergency)

      expect(screen.getByText('Possible heart attack symptoms')).toBeTruthy()
    })

    it('does not repeat the generic safety net under the alert', () => {
      const { container } = renderCard(emergency)

      // The banner already says it, louder.
      expect(container.textContent).not.toMatch(SAFETY_NET)
    })
  })

  describe('an analysis that did not run', () => {
    const degraded: SymptomAnalysis = {
      ...baseAnalysis,
      specialty: 'urgent_care',
      specialty_name: 'Urgent Care',
      urgency: 'urgent',
      reasoning: 'We could not automatically assess your symptoms.',
      urgency_details: {
        priority: 2,
        color: 'orange',
        message: 'Schedule within 24-48 hours',
      },
      triage_source: 'fallback',
      assessment_failed: true,
    }

    it('says the check did not run', () => {
      renderCard(degraded)

      const alert = screen.getByRole('alert')
      expect(alert.textContent).toMatch(/couldn.t assess your symptoms/i)
      expect(alert.textContent).toMatch(/didn.t run/i)
    })

    it('does not label it a recommendation', () => {
      renderCard(degraded)

      expect(screen.queryByText('Recommendation')).toBeNull()
      expect(screen.getByText('Precautionary routing')).toBeTruthy()
    })
  })
})
