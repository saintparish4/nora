import { describe, it, expect } from '@jest/globals'
import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  it('cn merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('cn handles conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included')
  })

  it('cn merges tailwind classes properly', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})
