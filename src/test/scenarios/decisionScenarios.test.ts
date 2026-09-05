import { describe, expect, it } from 'vitest'
import {
  createInitialAnalysisState,
  setOpponentMode,
  setRangeFromText,
} from '../../app/analysis/AnalysisState'
import { evaluateDecision } from '../../app/analysis/DecisionService'
import { setBoardCard, setHeroCard } from '../../domain/game/cardEdits'
import { createInitialState } from '../../domain/game/createInitialState'
import type { PokerState } from '../../domain/game/PokerState'
import { createEquityEngine } from '../../engine/equity'
import { applyBlockers } from '../../engine/ranges/blockers'

function setCards(state: PokerState, hero: [string, string], board: string[]): PokerState {
  let s = state
  for (let i = 0; i < 2; i += 1) {
    const r = setHeroCard(s, i as 0 | 1, hero[i] as never)
    if (!r.ok) throw new Error(r.error.message)
    s = r.state
  }
  for (let i = 0; i < board.length; i += 1) {
    const r = setBoardCard(s, i as 0 | 1 | 2 | 3 | 4, board[i] as never)
    if (!r.ok) throw new Error(r.error.message)
    s = r.state
  }
  return s
}

function flopFacingBet(state: PokerState, betSize: number): PokerState {
  return {
    ...state,
    street: 'FLOP',
    actingPosition: 'BTN',
    currentBet: betSize,
    players: {
      ...state.players,
      BTN: {
        ...state.players.BTN,
        committedThisStreet: 0,
        stackChips: 10_000 - betSize,
        folded: false,
      },
      BB: {
        ...state.players.BB,
        committedThisStreet: betSize,
        committedTotal: betSize + 100,
        stackChips: 10_000 - betSize - 100,
        folded: false,
      },
      SB: { ...state.players.SB, folded: true },
      UTG: { ...state.players.UTG, folded: true },
      HJ: { ...state.players.HJ, folded: true },
      CO: { ...state.players.CO, folded: true },
    },
  }
}

function flopNoBet(state: PokerState): PokerState {
  return {
    ...state,
    street: 'FLOP',
    actingPosition: 'BTN',
    currentBet: 0,
    lastFullRaiseSize: 100,
    minimumRaiseTo: 100,
    players: {
      ...state.players,
      BTN: {
        ...state.players.BTN,
        committedThisStreet: 0,
        stackChips: 9900,
        folded: false,
      },
      BB: {
        ...state.players.BB,
        committedThisStreet: 0,
        stackChips: 9800,
        folded: false,
      },
      SB: { ...state.players.SB, folded: true },
      UTG: { ...state.players.UTG, folded: true },
      HJ: { ...state.players.HJ, folded: true },
      CO: { ...state.players.CO, folded: true },
    },
  }
}

describe('Decision scenarios', () => {
  it('Scenario 1: AA on Q84 vs QQ+,AKs,AKo facing bet — not FOLD', () => {
    let state = createInitialState({ heroPosition: 'BTN' })
    state = setCards(state, ['As', 'Ah'], ['Qs', '8h', '4c'])
    state = flopFacingBet(state, 300)

    let analysis = createInitialAnalysisState()
    analysis = setOpponentMode(analysis, 'RANGE')
    analysis = setRangeFromText(analysis, 'QQ+,AKs,AKo')
    expect(analysis.rangeParseError).toBeNull()

    const available = applyBlockers(analysis.range, ['As', 'Ah', 'Qs', '8h', '4c'])
    const equity = createEquityEngine().calculate({
      heroCards: ['As', 'Ah'],
      board: ['Qs', '8h', '4c'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(equity.ok).toBe(true)
    if (!equity.ok) return

    const decision = evaluateDecision(state, analysis, equity.result)
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.result.action).not.toBe('FOLD')
  })

  it('Scenario 2: 72o on AKQ vs strong range → FOLD when facing bet', () => {
    let state = createInitialState({ heroPosition: 'BTN' })
    state = setCards(state, ['7c', '2d'], ['As', 'Kh', 'Qd'])
    state = flopFacingBet(state, 500)

    let analysis = createInitialAnalysisState()
    analysis = setOpponentMode(analysis, 'RANGE')
    analysis = setRangeFromText(analysis, 'TT+,AQs+,AKo')

    const available = applyBlockers(analysis.range, ['7c', '2d', 'As', 'Kh', 'Qd'])
    const equity = createEquityEngine().calculate({
      heroCards: ['7c', '2d'],
      board: ['As', 'Kh', 'Qd'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(equity.ok).toBe(true)
    if (!equity.ok) return

    const decision = evaluateDecision(state, analysis, equity.result)
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.result.action).toBe('FOLD')
  })

  it('Scenario 3: no bet + strong hand → BET', () => {
    let state = createInitialState({ heroPosition: 'BTN' })
    state = setCards(state, ['As', 'Ah'], ['Kd', '8h', '4c'])
    state = flopNoBet(state)

    let analysis = createInitialAnalysisState()
    analysis = setOpponentMode(analysis, 'RANGE')
    analysis = setRangeFromText(analysis, '22+,ATs+,KQo+')

    const available = applyBlockers(analysis.range, ['As', 'Ah', 'Kd', '8h', '4c'])
    const equity = createEquityEngine().calculate({
      heroCards: ['As', 'Ah'],
      board: ['Kd', '8h', '4c'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    expect(equity.result.equity).toBeGreaterThanOrEqual(0.6)

    const decision = evaluateDecision(state, analysis, equity.result)
    expect(decision.ok).toBe(true)
    if (!decision.ok) return
    expect(decision.result.action).toBe('BET')
  })
})
