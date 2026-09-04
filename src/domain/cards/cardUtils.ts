import type { Card } from './Card'
import { FULL_DECK } from './deck'

export function isCardUsed(card: Card, used: ReadonlySet<Card>): boolean {
  return used.has(card)
}

export function availableCards(used: ReadonlySet<Card>): Card[] {
  return FULL_DECK.filter((card) => !used.has(card))
}

export function collectUsedCards(cards: ReadonlyArray<Card | null | undefined>): Set<Card> {
  const used = new Set<Card>()
  for (const card of cards) {
    if (card) {
      used.add(card)
    }
  }
  return used
}
