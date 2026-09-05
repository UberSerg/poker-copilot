import { describe, expect, it } from 'vitest'
import {
  createInitialAnalysisState,
  setOpponentMode,
  setRangeFromText,
} from '../../app/analysis/AnalysisState'
import { evaluateDecision } from '../../app/analysis/DecisionService'
import { setBoardCard, setHeroCard, setOpponentCard } from '../../domain/game/cardEdits'
import { createInitialState } from '../../domain/game/createInitialState'
import type { PokerState } from '../../domain/game/PokerState'
import { analyzeBoardTexture, analyzeHandContext } from '../../engine/analysis'
import { createEquityEngine } from '../../engine/equity'
import { applyBlockers } from '../../engine/ranges/blockers'
import { calculateConfidence } from '../../engine/decision/confidence'

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
      BTN: { ...state.players.BTN, committedThisStreet: 0, stackChips: 9900, folded: false },
      BB: { ...state.players.BB, committedThisStreet: 0, stackChips: 9800, folded: false },
      SB: { ...state.players.SB, folded: true },
      UTG: { ...state.players.UTG, folded: true },
      HJ: { ...state.players.HJ, folded: true },
      CO: { ...state.players.CO, folded: true },
    },
  }
}

function rangeEquity(
  hero: [string, string],
  board: string[],
  rangeText: string,
) {
  let analysis = createInitialAnalysisState()
  analysis = setOpponentMode(analysis, 'RANGE')
  analysis = setRangeFromText(analysis, rangeText)
  const available = applyBlockers(analysis.range, [...hero, ...board] as never)
  const equity = createEquityEngine().calculate({
    heroCards: hero as never,
    board: board as never,
    opponentMode: 'RANGE',
    rangeCombos: available.toCombos(),
  })
  return { analysis, equity }
}

describe('Decision intelligence scenarios', () => {
  it('1 top pair vs wide range → CALL', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Qd'], ['Qc', '8h', '3s'])
    state = flopFacingBet(state, 250)
    const { analysis, equity } = rangeEquity(['As', 'Qd'], ['Qc', '8h', '3s'], '22+,ATs+,KQo+,QJs')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok && d.result.action).not.toBe('FOLD')
    if (d.ok) expect(['CALL', 'RAISE']).toContain(d.result.action)
  })

  it('2 weak hand vs strong → FOLD', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['7c', '2d'], ['As', 'Kh', 'Qd'])
    state = flopFacingBet(state, 500)
    const { analysis, equity } = rangeEquity(['7c', '2d'], ['As', 'Kh', 'Qd'], 'TT+,AQs+,AKo')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok && d.result.action).toBe('FOLD')
  })

  it('3 overpair no bet → BET', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ah'], ['Kd', '8h', '4c'])
    state = flopNoBet(state)
    const { analysis, equity } = rangeEquity(['As', 'Ah'], ['Kd', '8h', '4c'], '22+,ATs+,KQo+')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok && d.result.action).toBe('BET')
  })

  it('4 wet board warning on bet', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ad'], ['Js', 'Ts', '9d'])
    state = flopNoBet(state)
    const { analysis, equity } = rangeEquity(['As', 'Ad'], ['Js', 'Ts', '9d'], '22+,ATs+')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    if (d.result.action === 'BET') {
      expect(d.result.warnings.some((w) => w.includes('улучшений'))).toBe(true)
    }
  })

  it('5 dry board texture', () => {
    const t = analyzeBoardTexture(['As', '7d', '2c'])
    expect(t.texture).toBe('DRY')
  })

  it('6 flush draw hand context', () => {
    const h = analyzeHandContext(['As', 'Js'], ['Ks', '7s', '2d'])
    expect(h.drawContext).toBe('FLUSH_DRAW')
  })

  it('7 straightish draw context present or none', () => {
    const h = analyzeHandContext(['9s', '8d'], ['7c', '2h', '3s'])
    expect(['STRAIGHT_DRAW', 'NONE', 'COMBO_DRAW']).toContain(h.drawContext)
  })

  it('8 exact opponent confidence high path', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ah'], ['Kd', '8h', '4c'])
    state = flopFacingBet(state, 200)
    let r = setOpponentCard(state, 0, 'Ks')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    state = r.state
    r = setOpponentCard(state, 1, 'Kh')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    state = r.state
    const analysis = setOpponentMode(createInitialAnalysisState(), 'EXACT')
    const equity = createEquityEngine().calculate({
      heroCards: ['As', 'Ah'],
      board: ['Kd', '8h', '4c'],
      opponentMode: 'EXACT',
      opponentCards: ['Ks', 'Kh'],
    })
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    expect(['HIGH', 'MEDIUM']).toContain(d.result.confidence)
  })

  it('9 random opponent lower confidence than exact for same math', () => {
    const exact = calculateConfidence({
      equity: 0.65,
      required: 0.3,
      opponentMode: 'EXACT',
      street: 'RIVER',
      handStrength: 'STRONG',
    })
    const random = calculateConfidence({
      equity: 0.65,
      required: 0.3,
      opponentMode: 'RANDOM',
      street: 'FLOP',
      handStrength: 'MEDIUM',
    })
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 }
    expect(rank[exact]).toBeGreaterThanOrEqual(rank[random])
  })

  it('10 borderline LOW confidence', () => {
    const c = calculateConfidence({
      equity: 0.51,
      required: 0.48,
      opponentMode: 'RANGE',
      street: 'FLOP',
      rangeComboCount: 300,
      handStrength: 'MEDIUM',
    })
    expect(c).toBe('LOW')
  })

  it('11 AA vs QQ+AK facing not fold', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ah'], ['Qs', '8h', '4c'])
    state = flopFacingBet(state, 300)
    const { analysis, equity } = rangeEquity(['As', 'Ah'], ['Qs', '8h', '4c'], 'QQ+,AKs,AKo')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok && d.result.action).not.toBe('FOLD')
  })

  it('12 audit trail present', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Qd'], ['Qc', '8h', '3s'])
    state = flopFacingBet(state, 250)
    const { analysis, equity } = rangeEquity(['As', 'Qd'], ['Qc', '8h', '3s'], '22+,ATs+')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    expect(d.result.audit.rulesTriggered.length).toBeGreaterThan(0)
    expect(d.result.explanationSections.length).toBeGreaterThanOrEqual(2)
  })

  it('13 empty range unavailable', () => {
    const state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ah'], ['Kd', '8h', '4c'])
    const analysis = setOpponentMode(createInitialAnalysisState(), 'RANGE')
    const d = evaluateDecision(state, analysis, {
      wins: 1,
      ties: 0,
      losses: 0,
      winProbability: 1,
      tieProbability: 0,
      lossProbability: 0,
      equity: 1,
      iterations: 1,
      method: 'EXACT',
    })
    expect(d.ok).toBe(false)
  })

  it('14 missing equity unavailable', () => {
    const state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Ah'], ['Kd', '8h', '4c'])
    const d = evaluateDecision(state, createInitialAnalysisState(), null)
    expect(d.ok).toBe(false)
  })

  it('15 small bet size context in audit', () => {
    let state = setCards(createInitialState({ heroPosition: 'BTN' }), ['As', 'Qd'], ['Qc', '8h', '3s'])
    state = flopFacingBet(state, 150)
    const { analysis, equity } = rangeEquity(['As', 'Qd'], ['Qc', '8h', '3s'], '22+,ATs+,KQo+')
    expect(equity.ok).toBe(true)
    if (!equity.ok) return
    const d = evaluateDecision(state, analysis, equity.result)
    expect(d.ok).toBe(true)
    if (!d.ok) return
    expect(d.result.audit.context.betSize).toBeDefined()
  })
})
