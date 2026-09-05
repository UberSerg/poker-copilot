import { ALL_HAND_CLASSES } from './allHandClasses'
import { formatHandClass } from './HandClass'
import type { PokerRange } from './Range'

/**
 * Canonical formatter without aggressive + compression.
 * Emits hand classes in matrix order with optional :N% weights.
 */
export function formatRange(range: PokerRange): string {
  const classWeights = range.toHandClassWeights()
  const parts: string[] = []
  for (const hand of ALL_HAND_CLASSES) {
    const key = formatHandClass(hand)
    const weight = classWeights.get(key)
    if (weight === undefined || weight <= 0) continue
    if (weight >= 0.999) {
      parts.push(key)
    } else {
      const pct = Math.round(weight * 1000) / 10
      const pctText = Number.isInteger(pct) ? String(pct) : String(pct)
      parts.push(`${key}:${pctText}%`)
    }
  }
  return parts.join(',')
}
