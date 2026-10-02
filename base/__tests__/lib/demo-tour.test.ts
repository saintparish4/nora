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

  it('shows the medical assistant first and changes account exactly once', () => {
    const roles = TOUR_STEPS.map((step) => step.role)
    const switches = roles.filter((role, i) => i > 0 && role !== roles[i - 1]).length

    expect(roles[0]).toBe('staff')
    expect(roles[roles.length - 1]).toBe('clinician')
    expect(switches).toBe(1)
  })

  it('only clicks things that look, never things that change a request', () => {
    const clicked = TOUR_STEPS.flatMap((step) => [...(step.before ?? []), ...(step.after ?? [])])

    expect(clicked.length).toBeGreaterThan(0)
    for (const selector of clicked) expect(selector).toMatch(/requirements|view-document|dialog-close/)
  })
})
