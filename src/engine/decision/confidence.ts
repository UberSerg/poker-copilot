import type { DecisionConfidence } from './DecisionResult'
import {
  CONFIDENCE_HIGH_GAP,
  CONFIDENCE_MEDIUM_GAP,
} from './constants'

export function confidenceFromGap(equity: number, required: number): DecisionConfidence {
  const gap = Math.abs(equity - required)
  if (gap >= CONFIDENCE_HIGH_GAP) return 'HIGH'
  if (gap >= CONFIDENCE_MEDIUM_GAP) return 'MEDIUM'
  return 'LOW'
}

export function confidenceFromEquityStrength(equity: number, threshold: number): DecisionConfidence {
  const gap = equity - threshold
  if (gap >= CONFIDENCE_HIGH_GAP) return 'HIGH'
  if (gap >= CONFIDENCE_MEDIUM_GAP) return 'MEDIUM'
  return 'LOW'
}
