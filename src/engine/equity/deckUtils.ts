import type { Card } from '../../domain/cards/Card'
import { FULL_DECK } from '../../domain/cards/deck'
import { cardCombinations } from '../hand-evaluator/nativeEvaluator'

export function remainingDeck(dead: ReadonlySet<Card>): Card[] {
  return FULL_DECK.filter((card) => !dead.has(card))
}

export function collectDeadCards(cards: readonly (Card | null | undefined)[]): Set<Card> {
  const dead = new Set<Card>()
  for (const card of cards) {
    if (!card) continue
    if (dead.has(card)) {
      throw new Error('DUPLICATE_CARD')
    }
    dead.add(card)
  }
  return dead
}

export function combinationsCount(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  let result = 1
  for (let i = 1; i <= k; i += 1) {
    result = (result * (n - k + i)) / i
  }
  return Math.round(result)
}

export function boardCompletions(remaining: readonly Card[], missing: number): Card[][] {
  if (missing === 0) {
    return [[]]
  }
  return cardCombinations(remaining, missing)
}

export function holeCombinations(remaining: readonly Card[]): Card[][] {
  return cardCombinations(remaining, 2)
}
