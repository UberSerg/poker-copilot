/** Integer chip helpers. BB is display/input only — never stored as float in core. */

export function assertIntegerChips(chips: number, label = 'chips'): void {
  if (!Number.isInteger(chips)) {
    throw new Error(`${label} must be an integer, got ${chips}`)
  }
}

export function bbToChips(bb: number, bigBlind: number): number {
  assertIntegerChips(bigBlind, 'bigBlind')
  if (!Number.isFinite(bb) || bb <= 0) {
    throw new Error('bb must be a finite positive number')
  }
  const chips = Math.round(bb * bigBlind)
  assertIntegerChips(chips, 'converted chips')
  return chips
}

export function chipsToBb(chips: number, bigBlind: number): number {
  assertIntegerChips(chips, 'chips')
  assertIntegerChips(bigBlind, 'bigBlind')
  if (bigBlind <= 0) {
    throw new Error('bigBlind must be positive')
  }
  return chips / bigBlind
}

export function formatBb(chips: number, bigBlind: number, digits = 1): string {
  const bb = chipsToBb(chips, bigBlind)
  if (Number.isInteger(bb)) {
    return `${bb}`
  }
  return bb.toFixed(digits).replace(/\.0$/, '')
}
