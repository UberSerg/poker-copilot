import type { Card } from '../cards/Card'
import type { PokerState } from './PokerState'
import type { EquityInput, OpponentMode } from '../../engine/equity/types'
import { getDefaultHandEvaluator } from '../../engine/hand-evaluator/adapter'
import { formatEvaluatedHandRu } from '../../engine/hand-evaluator/formatRu'
import type { EvaluatedHand } from '../../engine/hand-evaluator/HandEvaluator'

export type BoardShape = 'NONE' | 'FLOP' | 'TURN' | 'RIVER' | 'INVALID'

export function getBoardCards(state: PokerState): Card[] {
  return state.board.filter((card): card is Card => card !== null)
}

export function getBoardShape(state: PokerState): BoardShape {
  const count = getBoardCards(state).length
  if (count === 0) return 'NONE'
  if (count === 3) return 'FLOP'
  if (count === 4) return 'TURN'
  if (count === 5) return 'RIVER'
  return 'INVALID'
}

export function hasHeroCards(state: PokerState): boolean {
  return state.heroCards[0] !== null && state.heroCards[1] !== null
}

export function hasOpponentCards(state: PokerState): boolean {
  return state.opponentCards[0] !== null && state.opponentCards[1] !== null
}

export function getHeroEvaluatedHand(state: PokerState): EvaluatedHand | null {
  if (!hasHeroCards(state)) return null
  const board = getBoardCards(state)
  if (board.length < 3) return null
  const evaluator = getDefaultHandEvaluator()
  return evaluator.evaluate([state.heroCards[0]!, state.heroCards[1]!, ...board])
}

export function getOpponentEvaluatedHand(state: PokerState): EvaluatedHand | null {
  if (!hasOpponentCards(state)) return null
  const board = getBoardCards(state)
  if (board.length < 3) return null
  const evaluator = getDefaultHandEvaluator()
  return evaluator.evaluate([state.opponentCards[0]!, state.opponentCards[1]!, ...board])
}

export type ShowdownResult = 'HERO' | 'OPPONENT' | 'TIE' | null

export function getShowdownResult(state: PokerState): ShowdownResult {
  if (getBoardShape(state) !== 'RIVER') return null
  if (!hasHeroCards(state) || !hasOpponentCards(state)) return null
  const hero = getHeroEvaluatedHand(state)
  const villain = getOpponentEvaluatedHand(state)
  if (!hero || !villain) return null
  const cmp = getDefaultHandEvaluator().compare(hero, villain)
  if (cmp > 0) return 'HERO'
  if (cmp < 0) return 'OPPONENT'
  return 'TIE'
}

export function buildEquityInput(
  state: PokerState,
  opponentMode: OpponentMode,
  iterations: number,
  seed?: number,
): { ok: true; input: EquityInput } | { ok: false; reason: string } {
  if (!hasHeroCards(state)) {
    return { ok: false, reason: 'Выберите две карты Hero' }
  }
  const shape = getBoardShape(state)
  if (shape === 'INVALID') {
    return { ok: false, reason: 'Для расчёта завершите флоп (3 карты борда)' }
  }
  if (opponentMode === 'EXACT' && !hasOpponentCards(state)) {
    return { ok: false, reason: 'Укажите две карты соперника или выберите случайную руку' }
  }

  const input: EquityInput = {
    heroCards: [state.heroCards[0]!, state.heroCards[1]!],
    board: getBoardCards(state),
    opponentMode,
    iterations,
    seed,
  }
  if (opponentMode === 'EXACT') {
    input.opponentCards = [state.opponentCards[0]!, state.opponentCards[1]!]
  }
  return { ok: true, input }
}

export function formatHeroComboRu(state: PokerState): string {
  const hand = getHeroEvaluatedHand(state)
  if (!hand) {
    return 'Комбинация определяется после флопа'
  }
  return formatEvaluatedHandRu(hand)
}
