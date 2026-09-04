/**
 * Pot odds as required equity fraction: call / (pot + call).
 * Returns null when there is nothing to call.
 */
export function getPotOdds(potChips: number, callChips: number): number | null {
  if (!Number.isFinite(potChips) || !Number.isFinite(callChips)) {
    return null
  }
  if (callChips <= 0) {
    return null
  }
  if (potChips < 0) {
    return null
  }
  return callChips / (potChips + callChips)
}

export function formatPotOddsPercent(potOdds: number | null, digits = 1): string {
  if (potOdds === null || !Number.isFinite(potOdds)) {
    return '—'
  }
  return `${(potOdds * 100).toFixed(digits)}%`
}
