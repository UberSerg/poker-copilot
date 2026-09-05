import type { Card } from '../../domain/cards/Card'
import { applyBlockers } from './blockers'
import type { PokerRange } from './Range'

export interface RangeStats {
  handClasses: number
  rawCombos: number
  availableCombos: number
  weightedRawCombos: number
  weightedAvailableCombos: number
  blockedCombos: number
}

export function computeRangeStats(
  range: PokerRange,
  knownCards: readonly Card[] = [],
): RangeStats {
  const rawCombos = range.size
  const weightedRawCombos = range.toCombos().reduce((sum, c) => sum + c.weight, 0)
  const available = applyBlockers(range, knownCards)
  const availableCombos = available.size
  const weightedAvailableCombos = available
    .toCombos()
    .reduce((sum, c) => sum + c.weight, 0)
  return {
    handClasses: range.toHandClassWeights().size,
    rawCombos,
    availableCombos,
    weightedRawCombos,
    weightedAvailableCombos,
    blockedCombos: rawCombos - availableCombos,
  }
}
