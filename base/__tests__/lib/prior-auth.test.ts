import { describe, it, expect } from '@jest/globals'
import {
  approvalBlocker,
  describeEvent,
  highlightSegments,
  isEditable,
  metBlocker,
  packetAvailable,
  sortEvidence,
  unresolvedRequirements,
} from '@/lib/prior-auth'
import { priorAuthorizationFixture } from '../fixtures/prior-authorization'

describe('approvalBlocker', () => {
  it('blocks staff regardless of state', () => {
    const pa = priorAuthorizationFixture({ status: 'ready_for_review' })
    expect(approvalBlocker(pa, 'staff')).toMatch(/clinician or an admin/)
  })

  it('counts requirements that are still open', () => {
    const pa = priorAuthorizationFixture()
    expect(approvalBlocker(pa, 'clinician')).toBe('1 requirement still needs to be met or marked not applicable.')
  })

  it('allows a clinician once every requirement is resolved and the request is ready', () => {
    const base = priorAuthorizationFixture()
    const pa = priorAuthorizationFixture({
      status: 'ready_for_review',
      requirements: base.requirements.map((r) => ({ ...r, status: r.status === 'pending' ? 'not_applicable' : r.status, note: 'n/a' })),
    })
    expect(unresolvedRequirements(pa)).toHaveLength(0)
    expect(approvalBlocker(pa, 'clinician')).toBeNull()
    expect(approvalBlocker(pa, 'admin')).toBeNull()
  })

  it('says so when the current approval still stands', () => {
    const pa = priorAuthorizationFixture({
      status: 'approved',
      approval: { approved_by: { id: 2, name: 'Avery Chen', email: 'a@example.com', role: 'clinician' }, approved_at: '2026-09-30T13:00:00Z', current: true },
    })
    expect(approvalBlocker(pa, 'clinician')).toBe('Already approved.')
  })
})

describe('metBlocker', () => {
  const [met, pending] = priorAuthorizationFixture().requirements

  it('allows met once a piece of evidence is verified', () => {
    expect(metBlocker(met)).toBeNull()
  })

  it('blocks met with no verified evidence', () => {
    expect(metBlocker(pending)).toMatch(/Verify at least one/)
  })

  it('does not count verified evidence that was later rejected', () => {
    const ev = { ...met.evidence[0], verified: true, rejected: true }
    expect(metBlocker({ ...met, evidence: [ev] })).not.toBeNull()
  })
})

describe('packetAvailable', () => {
  const approval = { approved_by: { id: 2, name: 'Avery Chen', email: 'a@example.com', role: 'clinician' as const }, approved_at: '2026-09-30T13:00:00Z', current: true }

  it('needs an approval', () => {
    expect(packetAvailable({ status: 'approved', approval: null })).toBe(false)
  })

  it('needs the approval to be current while still approved', () => {
    expect(packetAvailable({ status: 'approved', approval })).toBe(true)
    expect(packetAvailable({ status: 'approved', approval: { ...approval, current: false } })).toBe(false)
  })

  it('stays available after submission and a decision', () => {
    expect(packetAvailable({ status: 'submitted', approval })).toBe(true)
    expect(packetAvailable({ status: 'denied', approval })).toBe(true)
  })

  it('is not offered for a cancelled request', () => {
    expect(packetAvailable({ status: 'cancelled', approval })).toBe(false)
  })
})

describe('isEditable', () => {
  it('allows edits until submission', () => {
    expect(isEditable('gathering')).toBe(true)
    expect(isEditable('approved')).toBe(true)
    expect(isEditable('submitted')).toBe(false)
    expect(isEditable('closed')).toBe(false)
  })
})

describe('sortEvidence', () => {
  it('puts unreviewed first, rejected last, and higher confidence first within a group', () => {
    const base = priorAuthorizationFixture().requirements[0].evidence[0]
    const sorted = sortEvidence([
      { ...base, id: 1, verified: false, rejected: true, confidence: 0.99 },
      { ...base, id: 2, verified: true, rejected: false, confidence: 0.5 },
      { ...base, id: 3, verified: false, rejected: false, confidence: 0.4 },
      { ...base, id: 4, verified: false, rejected: false, confidence: 0.8 },
    ])
    expect(sorted.map((e) => e.id)).toEqual([4, 3, 2, 1])
  })
})

describe('highlightSegments', () => {
  const body = 'Vitals: BMI 34.2. BP 128/82. Obesity.'

  it('splits the text around a range', () => {
    expect(highlightSegments(body, [[8, 17]])).toEqual([
      { text: 'Vitals: ', highlighted: false },
      { text: 'BMI 34.2.', highlighted: true },
      { text: ' BP 128/82. Obesity.', highlighted: false },
    ])
  })

  it('merges overlapping ranges', () => {
    const segs = highlightSegments(body, [[8, 14], [12, 17]])
    expect(segs.filter((s) => s.highlighted).map((s) => s.text)).toEqual(['BMI 34.2.'])
  })

  it('clamps ranges past the end and drops empty ones', () => {
    const segs = highlightSegments(body, [[30, 500], [5, 5]])
    expect(segs.filter((s) => s.highlighted).map((s) => s.text)).toEqual([body.slice(30)])
    expect(segs.map((s) => s.text).join('')).toBe(body)
  })
})

describe('describeEvent', () => {
  it('reports how many quotes were found and discarded', () => {
    expect(describeEvent('extraction_succeeded', { rule: 2, ai: 1, unverifiable_quotes: 1 })).toBe(
      'Extraction finished: 3 excerpts found, 1 unverifiable quote discarded'
    )
  })

  it('labels status changes', () => {
    expect(describeEvent('status_changed', {}, 'ready_for_review')).toBe('Status: Ready for approval')
  })
})
