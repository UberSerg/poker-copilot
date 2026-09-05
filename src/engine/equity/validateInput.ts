import type { Card } from '../../domain/cards/Card'
import type { EquityError, EquityInput } from './types'

export function validateEquityInput(input: EquityInput): EquityError | null {
  if (!input.heroCards || input.heroCards.length !== 2) {
    return { code: 'MISSING_HERO_CARDS', message: 'Hero needs exactly 2 cards' }
  }
  if (!input.heroCards[0] || !input.heroCards[1]) {
    return { code: 'MISSING_HERO_CARDS', message: 'Hero needs exactly 2 cards' }
  }

  const boardLen = input.board.length
  if (![0, 3, 4, 5].includes(boardLen)) {
    return { code: 'INVALID_BOARD', message: 'Board must have 0, 3, 4 or 5 cards' }
  }

  if (input.opponentMode === 'EXACT') {
    if (!input.opponentCards || !input.opponentCards[0] || !input.opponentCards[1]) {
      return {
        code: 'INCOMPLETE_OPPONENT_HAND',
        message: 'Exact opponent needs two cards',
      }
    }
  }

  if (input.opponentMode === 'RANGE') {
    if (!input.rangeCombos || input.rangeCombos.length === 0) {
      return {
        code: 'RANGE_EMPTY_AFTER_BLOCKERS',
        message: 'Range has no legal combos after blockers',
      }
    }
  }

  const all: Card[] = [...input.heroCards, ...input.board]
  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    all.push(...input.opponentCards)
  }
  const seen = new Set<Card>()
  for (const card of all) {
    if (seen.has(card)) {
      return { code: 'DUPLICATE_CARD', message: 'Duplicate card in equity input' }
    }
    seen.add(card)
  }

  if (input.opponentMode === 'RANGE' && input.rangeCombos) {
    for (const combo of input.rangeCombos) {
      if (combo.cards[0] === combo.cards[1]) {
        return { code: 'DUPLICATE_CARD', message: 'Duplicate card in range combo' }
      }
      if (seen.has(combo.cards[0]) || seen.has(combo.cards[1])) {
        return { code: 'DUPLICATE_CARD', message: 'Range combo intersects known cards' }
      }
    }
  }

  return null
}
