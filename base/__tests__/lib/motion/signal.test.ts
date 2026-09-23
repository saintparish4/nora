import { describe, it, expect } from '@jest/globals'
import {
  buildSignalPoints,
  buildSignalPath,
  toPathData,
  clamp01,
} from '@/lib/motion/signal'

const BASE = { width: 1000, height: 200, resolution: 0 }

function amplitudeOf(resolution: number): number {
  const points = buildSignalPoints({ ...BASE, resolution })
  const mid = BASE.height / 2
  return Math.max(...points.map((p) => Math.abs(p.y - mid)))
}

/** Mean absolute difference between consecutive samples — a roughness proxy. */
function roughnessOf(resolution: number): number {
  const points = buildSignalPoints({ ...BASE, resolution })
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    total += Math.abs(points[i].y - points[i - 1].y)
  }
  return total / (points.length - 1)
}

describe('buildSignalPoints', () => {
  it('spans the full width, left to right', () => {
    const points = buildSignalPoints({ ...BASE, resolution: 0.5 })

    expect(points[0].x).toBe(0)
    expect(points[points.length - 1].x).toBe(BASE.width)
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i].x).toBeGreaterThan(points[i - 1].x)
    }
  })

  it('is deterministic, so the server and client render the same path', () => {
    // Not a style preference: a differing path would be a hydration mismatch
    // on the first paint of the homepage.
    const first = buildSignalPath({ ...BASE, resolution: 0.37 })
    const second = buildSignalPath({ ...BASE, resolution: 0.37 })

    expect(first).toBe(second)
  })

  it('produces a different shape for a different seed', () => {
    const a = buildSignalPath({ ...BASE, resolution: 0, seed: 1 })
    const b = buildSignalPath({ ...BASE, resolution: 0, seed: 2 })

    expect(a).not.toBe(b)
  })

  it('honours the requested sample count', () => {
    expect(buildSignalPoints({ ...BASE, resolution: 0.5, samples: 40 })).toHaveLength(40)
  })

  it('never returns fewer than two points, however few are asked for', () => {
    expect(buildSignalPoints({ ...BASE, resolution: 0.5, samples: 0 }).length).toBeGreaterThanOrEqual(2)
    expect(buildSignalPoints({ ...BASE, resolution: 0.5, samples: -5 }).length).toBeGreaterThanOrEqual(2)
  })

  it('stays inside the canvas at every resolution', () => {
    for (let r = 0; r <= 1; r += 0.1) {
      const points = buildSignalPoints({ ...BASE, resolution: r })
      const mid = BASE.height / 2

      for (const point of points) {
        expect(Math.abs(point.y - mid)).toBeLessThanOrEqual(BASE.height / 2)
      }
    }
  })

  describe('the resolve', () => {
    it('gets calmer as resolution rises — the whole point of the graphic', () => {
      const noisy = roughnessOf(0)
      const middling = roughnessOf(0.5)
      const resolved = roughnessOf(1)

      expect(noisy).toBeGreaterThan(middling)
      expect(middling).toBeGreaterThan(resolved)
    })

    it('still has a pulse once resolved, rather than flatlining', () => {
      // A flat line would be the wrong metaphor entirely for a health product.
      expect(amplitudeOf(1)).toBeGreaterThan(BASE.height * 0.1)
    })

    it('treats out-of-range resolution as the nearest valid end', () => {
      expect(buildSignalPath({ ...BASE, resolution: -3 })).toBe(
        buildSignalPath({ ...BASE, resolution: 0 })
      )
      expect(buildSignalPath({ ...BASE, resolution: 4 })).toBe(
        buildSignalPath({ ...BASE, resolution: 1 })
      )
    })
  })
})

describe('toPathData', () => {
  it('returns an empty string for no points', () => {
    expect(toPathData([])).toBe('')
  })

  it('returns a bare move for a single point', () => {
    expect(toPathData([{ x: 3, y: 4 }])).toBe('M 3 4')
  })

  it('emits one cubic segment per gap', () => {
    const points = buildSignalPoints({ ...BASE, resolution: 0.5, samples: 10 })

    const curves = toPathData(points).match(/C /g) ?? []
    expect(curves).toHaveLength(9)
  })

  it('emits only finite numbers', () => {
    const path = buildSignalPath({ ...BASE, resolution: 0.5 })

    expect(path).not.toMatch(/NaN|Infinity|undefined/)
  })

  it('rounds coordinates to keep the DOM attribute small', () => {
    const path = buildSignalPath({ ...BASE, resolution: 0.5 })
    const decimals = path.match(/\.\d{3,}/g)

    expect(decimals).toBeNull()
  })
})

describe('clamp01', () => {
  it('passes through values in range', () => {
    expect(clamp01(0.42)).toBe(0.42)
  })

  it('clamps outside the range', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(9)).toBe(1)
  })

  it('treats NaN as zero rather than poisoning the path', () => {
    expect(clamp01(Number.NaN)).toBe(0)
  })
})
