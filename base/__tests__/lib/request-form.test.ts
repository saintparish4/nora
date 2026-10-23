import { describe, it, expect } from '@jest/globals'
import { notesToAttach, prescriberMessage } from '@/lib/prior-auth'
import type { FormQuestion } from '@/types'
import { priorAuthorizationFixture } from '../fixtures/prior-authorization'

const question = (overrides: Partial<FormQuestion>): FormQuestion => ({
  link_id: 'q',
  prefix: null,
  text: 'Question?',
  plain: 'In plain words.',
  hidden: false,
  type: 'choice',
  repeats: false,
  options: [],
  status: 'answered',
  answer: null,
  source: null,
  reason: null,
  depends_on: [],
  origin: null,
  ...overrides,
})

describe('prescriberMessage', () => {
  it("lists only the questions for the prescriber's office, in the plan's words and numbering", () => {
    const message = prescriberMessage(
      [
        question({ link_id: 'a', prefix: '3.', text: 'Has the patient been in a program?', status: 'ask_prescriber' }),
        question({ link_id: 'b', text: 'Is the patient 18 or older?', status: 'answered' }),
        question({ link_id: 'c', text: 'FEP plan option', status: 'ask_prescriber', hidden: true }),
        question({ link_id: 'd', text: 'What was the baseline BMI?', status: 'ask_prescriber' }),
      ],
      { patient: 'Jane Rivera', item: 'Wegovy', payer: 'Cigna' }
    )
    expect(message.split('\n')).toEqual([
      'Prior authorization for Jane Rivera, Wegovy, Cigna.',
      expect.stringContaining('Please reply with the answers'),
      '',
      '1. (3.) Has the patient been in a program?',
      '2. What was the baseline BMI?',
    ])
  })
})

describe('notesToAttach', () => {
  it('lists each chart note behind verified, unrejected evidence once', () => {
    const base = priorAuthorizationFixture()
    const [first] = base.requirements
    const evidence = first.evidence[0] ?? base.requirements.flatMap((r) => r.evidence)[0]
    const verified = { ...evidence, verified: true, rejected: false }
    const pa = priorAuthorizationFixture({
      requirements: [
        { ...first, evidence: [verified, { ...verified, id: verified.id + 100 }] },
        { ...first, id: first.id + 1, evidence: [{ ...verified, id: verified.id + 200, verified: false }] },
      ],
    })
    expect(notesToAttach(pa)).toEqual([expect.objectContaining({ id: evidence.document.id, title: evidence.document.title })])
  })
})
