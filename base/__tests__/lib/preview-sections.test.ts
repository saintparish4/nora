import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

/**
 * The flag is read at module load, so each case re-imports with a fresh env.
 * The default (unset) case is the one that matters: fabricated lab results and
 * balances must stay hidden unless someone opts in on purpose.
 */
describe('PREVIEW_SECTIONS_ENABLED', () => {
  const original = process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS

  beforeEach(() => {
    jest.resetModules()
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS = original
  })

  it('is off when the variable is unset', async () => {
    delete process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS

    const { PREVIEW_SECTIONS_ENABLED } = await import('@/lib/preview-sections')

    expect(PREVIEW_SECTIONS_ENABLED).toBe(false)
  })

  it('is on only for the exact string "true"', async () => {
    process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS = 'true'

    const { PREVIEW_SECTIONS_ENABLED } = await import('@/lib/preview-sections')

    expect(PREVIEW_SECTIONS_ENABLED).toBe(true)
  })

  it.each(['false', '1', 'yes', 'TRUE', ''])(
    'stays off for %p',
    async (value) => {
      process.env.NEXT_PUBLIC_SHOW_PREVIEW_SECTIONS = value

      const { PREVIEW_SECTIONS_ENABLED } = await import('@/lib/preview-sections')

      expect(PREVIEW_SECTIONS_ENABLED).toBe(false)
    }
  )
})
