import type { Card } from '../../domain/cards/Card'
import type { WeightedCombo } from './RangeCombo'
import type { Rng } from '../equity/rng'

export interface RangeDistribution {
  combos: readonly WeightedCombo[]
  /** cumulative[i] = sum(weights[0..i]) */
  cumulative: readonly number[]
  totalWeight: number
}

export function buildRangeDistribution(
  combos: readonly WeightedCombo[],
): RangeDistribution {
  const filtered = combos.filter((c) => c.weight > 0)
  const cumulative: number[] = []
  let total = 0
  for (const combo of filtered) {
    total += combo.weight
    cumulative.push(total)
  }
  return { combos: filtered, cumulative, totalWeight: total }
}

/** Sample one combo proportional to weight. */
export function sampleWeightedCombo(
  distribution: RangeDistribution,
  rng: Rng,
): WeightedCombo {
  if (distribution.combos.length === 0 || distribution.totalWeight <= 0) {
    throw new Error('EMPTY_DISTRIBUTION')
  }
  const target = rng() * distribution.totalWeight
  // Linear scan is fine for typical ranges; binary for larger.
  const n = distribution.cumulative.length
  if (n <= 64) {
    for (let i = 0; i < n; i += 1) {
      if (target < distribution.cumulative[i]!) {
        return distribution.combos[i]!
      }
    }
    return distribution.combos[n - 1]!
  }
  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (distribution.cumulative[mid]! <= target) lo = mid + 1
    else hi = mid
  }
  return distribution.combos[lo]!
}

export function sampleComboCards(
  distribution: RangeDistribution,
  rng: Rng,
): readonly [Card, Card] {
  return sampleWeightedCombo(distribution, rng).cards
}
