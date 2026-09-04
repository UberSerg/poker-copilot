import { evaluateStrings } from '@pokertools/evaluator'
import type { Card } from '../../domain/cards/Card'
import type { EvaluatedHand, HandEvaluator } from './HandEvaluator'
import { createHandEvaluator } from './nativeEvaluator'

/**
 * Fast strength for equity loops via @pokertools/evaluator lookup tables.
 * Library score: lower is better → we negate so higher is better (matches our compare).
 * UI/showdown still uses NativeHandEvaluator for bestFive + Russian labels.
 */
export function handStrength(cards: readonly Card[]): number {
  return -evaluateStrings([...cards] as string[])
}

export function compareHoleBoards(
  heroHole: readonly Card[],
  villainHole: readonly Card[],
  board: readonly Card[],
): number {
  const hero = handStrength([...heroHole, ...board])
  const villain = handStrength([...villainHole, ...board])
  if (hero === villain) return 0
  return hero > villain ? 1 : -1
}

/** Adapter used by UI: native bestFive + categories; library not exposed. */
export class AdapterHandEvaluator implements HandEvaluator {
  private readonly native = createHandEvaluator()

  evaluate(cards: readonly Card[]): EvaluatedHand {
    return this.native.evaluate(cards)
  }

  compare(a: EvaluatedHand, b: EvaluatedHand): number {
    return this.native.compare(a, b)
  }
}

export function createHandEvaluatorAdapter(): HandEvaluator {
  return new AdapterHandEvaluator()
}
