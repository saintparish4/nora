/**
 * The maths behind NORA's signature graphic: one continuous line that starts as
 * the noise of a patient describing symptoms and resolves into a clean clinical
 * signal as you scroll.
 *
 * It is pure and deterministic on purpose. Pure because the interesting part is
 * the shape, and a shape you can unit-test is a shape you can trust. Deterministic
 * because `Math.random()` here would hand the server and the client different
 * paths and React would throw a hydration mismatch on the first paint of the
 * homepage.
 */

export interface SignalPoint {
  x: number;
  y: number;
}

export interface SignalOptions {
  /** Viewport width of the generated path. */
  width: number;
  /** Viewport height; the line oscillates around the vertical centre. */
  height: number;
  /** How many points to sample. More is smoother and costs more to render. */
  samples?: number;
  /**
   * 0 → raw, arrhythmic symptom noise.
   * 1 → a resolved, regular signal.
   * Anything between is the transition, which is what the scroll drives.
   */
  resolution: number;
  /** Fixed seed keeps server and client output identical. */
  seed?: number;
}

const DEFAULT_SAMPLES = 220;
const DEFAULT_SEED = 0x5eed;

/**
 * mulberry32 — small, fast, and good enough for visual noise. Chosen over
 * Math.random for reproducibility, not for statistical quality.
 */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/**
 * A single heartbeat, as a function of position within one beat (0..1).
 *
 * Deliberately shaped rather than sampled from real data: a small P wave, the
 * sharp QRS complex that makes it read as a pulse at a glance, and a rounded T
 * wave. Returns a multiplier in roughly -1..1.
 */
function beat(phase: number): number {
  if (phase < 0.18) return Math.sin(phase * (Math.PI / 0.18)) * 0.18;
  if (phase < 0.26) return -0.22;
  if (phase < 0.32) return lerp(-0.22, 1, (phase - 0.26) / 0.06);
  if (phase < 0.38) return lerp(1, -0.45, (phase - 0.32) / 0.06);
  if (phase < 0.46) return lerp(-0.45, 0, (phase - 0.38) / 0.08);
  if (phase < 0.72) return Math.sin((phase - 0.46) * (Math.PI / 0.26)) * 0.3;
  return 0;
}

/**
 * Builds the line.
 *
 * At low resolution the trace is loud and irregular — several detuned sine
 * components plus jitter, with beats landing at uneven intervals. As resolution
 * rises the noise falls away and the beats settle onto a regular rhythm.
 */
export function buildSignalPoints(options: SignalOptions): SignalPoint[] {
  const {
    width,
    height,
    samples = DEFAULT_SAMPLES,
    resolution,
    seed = DEFAULT_SEED,
  } = options;

  const count = Math.max(2, Math.floor(samples));
  const settled = clamp01(resolution);
  const midline = height / 2;

  // Noise shrinks as the picture resolves; the beat grows into place.
  const noiseAmplitude = (height / 2) * 0.55 * (1 - settled);
  const beatAmplitude = (height / 2) * 0.62 * settled;

  const random = createRandom(seed);
  // Pre-draw the jitter so every sample uses a stable value rather than
  // advancing the generator differently on each re-render.
  const jitter = Array.from({ length: count }, () => random() * 2 - 1);
  // Irregular beat spacing that straightens out as `settled` approaches 1.
  const wobble = Array.from({ length: 8 }, () => random() * 2 - 1);

  const points: SignalPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const t = index / (count - 1);
    const x = t * width;

    // Three detuned components: chaos that never quite repeats.
    const noise =
      Math.sin(t * 27.3) * 0.5 +
      Math.sin(t * 61.7 + 1.4) * 0.3 +
      Math.sin(t * 13.1 + 2.9) * 0.2 +
      jitter[index] * 0.45;

    // Four beats across the width. Their spacing is skewed by `wobble` while
    // the signal is unresolved, which is what makes it read as arrhythmic.
    const beatsAcross = 4;
    const raw = t * beatsAcross;
    const beatIndex = Math.floor(raw) % wobble.length;
    const skew = wobble[beatIndex] * 0.22 * (1 - settled);
    const phase = clamp01((raw % 1) + skew);

    const y = midline - (noise * noiseAmplitude + beat(phase) * beatAmplitude);

    points.push({ x, y });
  }

  return points;
}

/**
 * Catmull-Rom through the points, emitted as cubic béziers.
 *
 * Smoothing rather than a polyline because the line is the brand mark as much
 * as it is a readout — the sharp QRS still reads as a pulse because its points
 * sit close together, but the quiet stretches flow instead of faceting.
 */
export function toPathData(points: SignalPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

  const segments: string[] = [`M ${round(points[0].x)} ${round(points[0].y)}`];

  for (let i = 0; i < points.length - 1; i += 1) {
    const previous = points[i - 1] ?? points[i];
    const current = points[i];
    const next = points[i + 1];
    const afterNext = points[i + 2] ?? next;

    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const control2 = {
      x: next.x - (afterNext.x - current.x) / 6,
      y: next.y - (afterNext.y - current.y) / 6,
    };

    segments.push(
      `C ${round(control1.x)} ${round(control1.y)}, ${round(control2.x)} ${round(control2.y)}, ${round(next.x)} ${round(next.y)}`
    );
  }

  return segments.join(" ");
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Convenience wrapper: options in, `d` attribute out. */
export function buildSignalPath(options: SignalOptions): string {
  return toPathData(buildSignalPoints(options));
}
