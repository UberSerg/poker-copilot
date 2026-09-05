/** Mulberry32 — deterministic PRNG for Monte Carlo tests. */
export type Rng = () => number

export function createSeededRandom(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Partial Fisher–Yates: sample `count` unique items without replacement. */
export function sampleWithoutReplacement<T>(items: readonly T[], count: number, rng: Rng): T[] {
  if (count > items.length) {
    throw new Error('sampleWithoutReplacement: count exceeds items')
  }
  const pool = [...items]
  const result: T[] = []
  for (let i = 0; i < count; i += 1) {
    const j = i + Math.floor(rng() * (pool.length - i))
    const tmp = pool[i]!
    pool[i] = pool[j]!
    pool[j] = tmp
    result.push(pool[i]!)
  }
  return result
}
