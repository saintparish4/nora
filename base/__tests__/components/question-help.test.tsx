import { describe, it, expect, beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockAsk = jest.fn()

jest.mock('@/lib/api', () => ({
  askPayerQuestion: (...args: unknown[]) => mockAsk(...args),
  getChartDocument: jest.fn(),
}))

import { QuestionHelp } from '@/components/workspace/question-help'

const result = (overrides = {}) => ({
  question: 'q',
  plain_language: 'They want to know whether another drug was tried.',
  what_counts: ['The drug name', 'How it ended'],
  answer: 'mentioned_only',
  findings: [
    {
      document: { id: 1, title: 'Pharmacy fill history', kind: 'medication_history', occurred_on: '2026-08-12' },
      excerpt: 'Phentermine 37.5 mg tablets, filled 02/03/2025; no refills on record.',
      start_offset: 10,
      end_offset: 80,
      supports: false,
      note: 'A fill, with no outcome.',
    },
  ],
  suggested_answer: null,
  ask_clinician: 'Please document how she responded to phentermine.',
  discarded_quotes: 1,
  chart_truncated: false,
  ...overrides,
})

describe('QuestionHelp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends the pasted question and shows the explanation, the quote, and what to ask', async () => {
    mockAsk.mockResolvedValue(result())
    render(<QuestionHelp priorAuthorizationId={7} />)

    await userEvent.type(screen.getByLabelText(/Paste a question/), 'Was a formulary alternative tried?')
    await userEvent.click(screen.getByRole('button', { name: 'Explain and check the chart' }))

    expect(mockAsk).toHaveBeenCalledWith(7, 'Was a formulary alternative tried?')
    expect(await screen.findByText('They want to know whether another drug was tried.')).toBeTruthy()
    expect(screen.getByText('Mentioned, not documented')).toBeTruthy()
    expect(screen.getByText(/Phentermine 37.5 mg tablets/)).toBeTruthy()
    expect(screen.getByText('Related, not enough')).toBeTruthy()
    expect(screen.getByText(/Please document how she responded/)).toBeTruthy()
    expect(screen.getByText(/1 quote from the model could not be found/)).toBeTruthy()
    expect(screen.queryByText(/A possible answer/)).toBeNull()
  })

  it('offers a suggested answer only when one comes back', async () => {
    mockAsk.mockResolvedValue(result({ answer: 'supported', suggested_answer: 'Yes. Saxenda, stopped for nausea.', ask_clinician: null }))
    render(<QuestionHelp priorAuthorizationId={7} suggestion="A trial of another medication is documented." />)

    await userEvent.click(screen.getByRole('button', { name: 'Use the selected criterion' }))

    expect(mockAsk).toHaveBeenCalledWith(7, 'A trial of another medication is documented.')
    expect(await screen.findByText(/Yes. Saxenda, stopped for nausea./)).toBeTruthy()
    expect(screen.getByText('Chart supports an answer')).toBeTruthy()
  })

  it('shows why when the model is not available', async () => {
    mockAsk.mockRejectedValue(new Error('This needs the model, which is not available here. OPENAI_API_KEY is not set.'))
    render(<QuestionHelp priorAuthorizationId={7} />)

    await userEvent.type(screen.getByLabelText(/Paste a question/), 'x')
    await userEvent.click(screen.getByRole('button', { name: 'Explain and check the chart' }))

    expect((await screen.findByRole('alert')).textContent).toContain('OPENAI_API_KEY is not set')
  })
})
