import type { Card, Rank, Suit } from '../../domain/cards/Card'
import { createCard, SUITS } from '../../domain/cards/Card'
import type { HandClass } from './HandClass'

export interface WeightedCombo {
  cards: readonly [Card, Card]
  weight: number
}

/** Canonical unordered combo key (lexicographic min/max of card strings). */
export function comboKey(a: Card, b: Card): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function canonicalCombo(a: Card, b: Card): readonly [Card, Card] {
  return a < b ? [a, b] : [b, a]
}

export function expandHandClass(hand: HandClass): readonly [Card, Card][] {
  if (hand.suitedness === 'PAIR') {
    return expandPair(hand.highRank)
  }
  if (hand.suitedness === 'SUITED') {
    return expandSuited(hand.highRank, hand.lowRank)
  }
  return expandOffsuit(hand.highRank, hand.lowRank)
}

function expandPair(rank: Rank): readonly [Card, Card][] {
  const cards = SUITS.map((suit) => createCard(rank, suit))
  const out: [Card, Card][] = []
  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      out.push(canonicalCombo(cards[i]!, cards[j]!) as [Card, Card])
    }
  }
  return out
}

function expandSuited(high: Rank, low: Rank): readonly [Card, Card][] {
  return SUITS.map((suit) => canonicalCombo(createCard(high, suit), createCard(low, suit)) as [Card, Card])
}

function expandOffsuit(high: Rank, low: Rank): readonly [Card, Card][] {
  const out: [Card, Card][] = []
  for (const s1 of SUITS) {
    for (const s2 of SUITS) {
      if (s1 === s2) continue
      out.push(canonicalCombo(createCard(high, s1), createCard(low, s2)) as [Card, Card])
    }
  }
  return out
}

export function expectedComboCount(hand: HandClass): number {
  if (hand.suitedness === 'PAIR') return 6
  if (hand.suitedness === 'SUITED') return 4
  return 12
}

export function cardsFromKey(key: string): readonly [Card, Card] | null {
  const parts = key.split('|')
  if (parts.length !== 2) return null
  const a = parts[0]
  const b = parts[1]
  if (!a || !b || a.length !== 2 || b.length !== 2) return null
  return canonicalCombo(a as Card, b as Card)
}

/** Suit unused helper for typing completeness in matrix tooling. */
export type { Suit }
