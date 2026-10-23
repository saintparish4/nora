import { describe, it, expect, beforeEach } from '@jest/globals'
import { TOUR_STEPS, readTour, startTour, writeTour } from '@/lib/demo-tour'

describe('the demo walkthrough', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('has no place until it is started', () => {
    expect(readTour()).toBeNull()
  })

  it('starts at the first step, playing, and keeps its place', () => {
    startTour()
    expect(readTour()).toEqual({ step: 0, playing: true })

    writeTour({ step: 4, playing: false })
    expect(readTour()).toEqual({ step: 4, playing: false })

    writeTour(null)
    expect(readTour()).toBeNull()
  })

  it('ignores a stored place it cannot use', () => {
    window.sessionStorage.setItem('nora-demo-tour', '{"step": 99, "playing": true}')
    expect(readTour()).toBeNull()

    window.sessionStorage.setItem('nora-demo-tour', 'not json')
    expect(readTour()).toBeNull()
  })

  it('spotlights only panels on the request page, so it never changes page', () => {
    const onRequestPage = /^\[data-tour="(requirements|requirement|evidence|tasks|approval|timeline)"\]$|^\[role="dialog"\]$/

    for (const step of TOUR_STEPS) expect(step.target).toMatch(onRequestPage)
  })

  it("selects only requirements that Cigna's six criteria have", () => {
    const positions = TOUR_STEPS.flatMap((step) => step.before ?? [])
      .map((selector) => selector.match(/li:nth-child\((\d+)\)/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number)

    expect(positions.length).toBeGreaterThan(0)
    for (const position of positions) expect(position).toBeLessThanOrEqual(6)
  })

  it('only clicks things that look, never things that change a request', () => {
    const clicked = TOUR_STEPS.flatMap((step) => [...(step.before ?? []), ...(step.after ?? [])])

    expect(clicked.length).toBeGreaterThan(0)
    for (const selector of clicked) expect(selector).toMatch(/requirements|view-document|dialog-close/)
  })
})
