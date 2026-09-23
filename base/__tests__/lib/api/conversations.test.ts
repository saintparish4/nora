import { describe, it, expect, beforeEach } from '@jest/globals'
import { getConversations, getConversation } from '@/lib/api/conversations'

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

function mockResponse(body: object, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response
}

const RISK_ASSESSMENT = {
  id: 7,
  care_level: 'urgent',
  confidence: null,
  reasoning: 'Worsening pain warrants prompt evaluation.',
  created_at: '2026-09-20T10:00:00Z',
  red_flags: ['worsening pain'],
  recommended_specialties: ['Orthopedics'],
  self_care_options: [],
  escalation_triggers: [],
}

const SUMMARY = {
  id: 1,
  session_id: 'abc-123',
  status: 'active',
  preview: 'My lower back has hurt for two weeks',
  message_count: 4,
  created_at: '2026-09-20T09:00:00Z',
  completed_at: null,
  latest_risk_assessment: RISK_ASSESSMENT,
}

describe('Conversations API', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('getConversations', () => {
    it('returns the conversations array', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ conversations: [SUMMARY] }))

      const conversations = await getConversations()

      expect(conversations).toHaveLength(1)
      expect(conversations[0].preview).toBe('My lower back has hurt for two weeks')
      expect(conversations[0].latest_risk_assessment?.care_level).toBe('urgent')
    })

    it('accepts a conversation with no recorded assessment', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          conversations: [{ ...SUMMARY, latest_risk_assessment: null, preview: null }],
        })
      )

      const conversations = await getConversations()

      expect(conversations[0].latest_risk_assessment).toBeNull()
      expect(conversations[0].preview).toBeNull()
    })

    it('requests the conversations endpoint', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ conversations: [] }))

      await getConversations()

      const [url] = mockFetch.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/conversations$/)
    })

    it('throws on a failed request', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ error: 'boom' }, 500))

      await expect(getConversations()).rejects.toThrow(
        'Failed to fetch symptom check history'
      )
    })
  })

  describe('getConversation', () => {
    it('returns the transcript and assessments', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          conversation: {
            ...SUMMARY,
            messages: [
              { id: 1, role: 'user', content: 'First', created_at: '2026-09-20T09:00:00Z' },
              { id: 2, role: 'assistant', content: 'Second', created_at: '2026-09-20T09:01:00Z' },
            ],
            risk_assessments: [RISK_ASSESSMENT],
          },
        })
      )

      const conversation = await getConversation(1)

      expect(conversation.messages.map((m) => m.content)).toEqual(['First', 'Second'])
      expect(conversation.risk_assessments).toHaveLength(1)
    })

    it('requests the conversation by id', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          conversation: { ...SUMMARY, messages: [], risk_assessments: [] },
        })
      )

      await getConversation(42)

      const [url] = mockFetch.mock.calls[0]
      expect(url).toMatch(/\/api\/v1\/conversations\/42$/)
    })

    it('surfaces the API error message', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ error: 'Resource not found' }, 404)
      )

      await expect(getConversation(99)).rejects.toThrow('Resource not found')
    })
  })
})
