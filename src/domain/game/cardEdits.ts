import type { Card } from '../cards/Card'
import type { BoardCards, HeroCards } from './PokerAction'
import type { DomainResult, PokerState } from './PokerState'
import { getUsedCards } from './selectors'

function usedWithout(state: PokerState, exclude: Card | null): Set<Card> {
  const used = getUsedCards(state)
  if (exclude) {
    used.delete(exclude)
  }
  return used
}

export function setHeroCard(
  state: PokerState,
  index: 0 | 1,
  card: Card | null,
): DomainResult<PokerState> {
  const previous = state.heroCards[index]
  if (card !== null) {
    const used = usedWithout(state, previous)
    if (used.has(card)) {
      return { ok: false, error: { code: 'DUPLICATE_CARD', message: 'Card is already used' } }
    }
  }

  const heroCards: HeroCards = [...state.heroCards]
  heroCards[index] = card
  return { ok: true, state: { ...state, heroCards } }
}

export function clearHeroCards(state: PokerState): PokerState {
  return { ...state, heroCards: [null, null] }
}

export function setBoardCard(
  state: PokerState,
  index: 0 | 1 | 2 | 3 | 4,
  card: Card | null,
): DomainResult<PokerState> {
  const previous = state.board[index]
  if (card !== null) {
    const used = usedWithout(state, previous)
    if (used.has(card)) {
      return { ok: false, error: { code: 'DUPLICATE_CARD', message: 'Card is already used' } }
    }
  }

  const board: BoardCards = [...state.board]
  board[index] = card
  return { ok: true, state: { ...state, board } }
}

export function clearBoard(state: PokerState): PokerState {
  return { ...state, board: [null, null, null, null, null] }
}
