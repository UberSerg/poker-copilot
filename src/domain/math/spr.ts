/**
 * SPR = effective stack / pot.
 * Returns null when pot is 0 or effective stack is unavailable.
 */
export function getSpr(effectiveStackChips: number | null, potChips: number): number | null {
  if (effectiveStackChips === null || !Number.isFinite(effectiveStackChips)) {
    return null
  }
  if (!Number.isFinite(potChips) || potChips <= 0) {
    return null
  }
  return effectiveStackChips / potChips
}

export function formatSpr(spr: number | null, digits = 1): string {
  if (spr === null || !Number.isFinite(spr)) {
    return '—'
  }
  return spr.toFixed(digits)
}
