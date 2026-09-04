import type { Card } from '../../domain/cards/Card'

export type HandCategory =
  | 'HIGH_CARD'
  | 'PAIR'
  | 'TWO_PAIR'
  | 'THREE_OF_A_KIND'
  | 'STRAIGHT'
  | 'FLUSH'
  | 'FULL_HOUSE'
  | 'FOUR_OF_A_KIND'
  | 'STRAIGHT_FLUSH'

export const HAND_CATEGORY_RANK: Record<HandCategory, number> = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
}

export interface EvaluatedHand {
  category: HandCategory
  bestFive: readonly Card[]
  /** Higher is better. Encodes category in high bits for quick compare. */
  rankValue: number
  /** Descending kickers / component ranks for same-category compare. */
  tiebreakers: readonly number[]
}

export interface HandEvaluator {
  evaluate(cards: readonly Card[]): EvaluatedHand
  compare(a: EvaluatedHand, b: EvaluatedHand): number
}
