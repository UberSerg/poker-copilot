import { createCard, RANKS, SUITS, type Card } from './Card'

export const FULL_DECK: readonly Card[] = RANKS.flatMap((rank) =>
  SUITS.map((suit) => createCard(rank, suit)),
)

export function createFullDeck(): Card[] {
  return [...FULL_DECK]
}
