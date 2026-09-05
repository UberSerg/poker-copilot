import type { Card } from '../../domain/cards/Card'
import { PokerRange } from './Range'
import { comboKey } from './RangeCombo'

/**
 * Remove combos that share any card with knownCards (Hero + board).
 * Does not mutate the input range.
 */
export function applyBlockers(
  range: PokerRange,
  knownCards: readonly Card[],
): PokerRange {
  const dead = new Set(knownCards)
  const kept = range.toCombos().filter((combo) => {
    return !dead.has(combo.cards[0]) && !dead.has(combo.cards[1])
  })
  return PokerRange.fromCombos(kept)
}

export function isComboBlocked(
  cards: readonly [Card, Card],
  knownCards: readonly Card[],
): boolean {
  const dead = new Set(knownCards)
  return dead.has(cards[0]) || dead.has(cards[1])
}

export function blockedComboKeys(
  range: PokerRange,
  knownCards: readonly Card[],
): string[] {
  const dead = new Set(knownCards)
  const keys: string[] = []
  for (const combo of range.toCombos()) {
    if (dead.has(combo.cards[0]) || dead.has(combo.cards[1])) {
      keys.push(comboKey(combo.cards[0], combo.cards[1]))
    }
  }
  return keys
}
