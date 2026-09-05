import type { DecisionContext } from './DecisionContext'
import type { DecisionConfidence } from './DecisionResult'
import {
  CONFIDENCE_HIGH_GAP,
  CONFIDENCE_MEDIUM_GAP,
  DECISION_SAFETY_MARGIN,
} from './constants'

export interface ConfidenceInput {
  equity: number
  required: number | null
  opponentMode: DecisionContext['opponentMode']
  street: DecisionContext['street']
  rangeComboCount?: number
  handStrength: DecisionContext['handContext']['strengthClass']
}

/**
 * Confidence V2: equity gap + opponent model quality + street + hand strength.
 */
export function calculateConfidence(input: ConfidenceInput): DecisionConfidence {
  let score = 0

  if (input.required !== null) {
    const gap = Math.abs(input.equity - input.required)
    if (gap >= CONFIDENCE_HIGH_GAP) score += 3
    else if (gap >= CONFIDENCE_MEDIUM_GAP) score += 2
    else if (gap <= DECISION_SAFETY_MARGIN) score -= 2
    else score += 1
  } else {
    // No pot odds (check/bet spot): use absolute equity
    if (input.equity >= 0.7) score += 2
    else if (input.equity >= 0.55) score += 1
    else score -= 1
  }

  if (input.opponentMode === 'EXACT') score += 2
  else if (input.opponentMode === 'RANGE') {
    const n = input.rangeComboCount ?? 100
    if (n <= 40) score += 1
    else if (n >= 200) score -= 1
  } else {
    score -= 1 // RANDOM
  }

  if (input.street === 'RIVER') score += 1
  else if (input.street === 'PREFLOP') score -= 1

  if (input.handStrength === 'MONSTER' || input.handStrength === 'STRONG') score += 1
  else if (input.handStrength === 'WEAK') score -= 1

  if (score >= 4) return 'HIGH'
  if (score >= 1) return 'MEDIUM'
  return 'LOW'
}

/** @deprecated use calculateConfidence */
export function confidenceFromGap(equity: number, required: number): DecisionConfidence {
  return calculateConfidence({
    equity,
    required,
    opponentMode: 'RANGE',
    street: 'FLOP',
    handStrength: 'MEDIUM',
  })
}

/** @deprecated use calculateConfidence */
export function confidenceFromEquityStrength(
  equity: number,
  threshold: number,
): DecisionConfidence {
  void threshold
  return calculateConfidence({
    equity,
    required: null,
    opponentMode: 'RANGE',
    street: 'FLOP',
    handStrength: 'MEDIUM',
  })
}
