import { describe, expect, it } from 'vitest'
import type { Card } from '../../domain/cards/Card'
import { createInitialState } from '../../domain/game/createInitialState'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerState } from '../../domain/game/PokerState'
import type { DecisionContext } from './DecisionContext'
import { createDecisionEngine } from './DecisionEngine'
import type { EquityResult } from '../equity/types'
import {
  BET_EQUITY_THRESHOLD,
  DECISION_SAFETY_MARGIN,
  RAISE_EQUITY_THRESHOLD,
} from './constants'

function equityResult(equity: number): EquityResult {
  const winProbability = equity
  return {
    wins: Math.round(equity * 1000),
    ties: 0,
    losses: Math.round((1 - equity) * 1000),
    winProbability,
    tieProbability: 0,
    lossProbability: 1 - winProbability,
    equity,
    iterations: 1000,
    method: 'EXACT',
  }
}

function baseContext(options: {
  equityValue: number
  toCall: number
  required?: number
}): DecisionContext {
  const state = createInitialState({ heroPosition: 'BTN' })
  let pokerState: PokerState = {
    ...state,
    street: 'FLOP',
    actingPosition: 'BTN',
    currentBet: options.toCall > 0 ? options.toCall : 0,
    players: {
      ...state.players,
      BTN: {
        ...state.players.BTN,
        committedThisStreet: 0,
        stackChips: 10_000,
      },
      BB: {
        ...state.players.BB,
        committedThisStreet: options.toCall > 0 ? options.toCall : 100,
        stackChips: 9900,
      },
    },
  }

  if (options.toCall === 0) {
    pokerState = {
      ...pokerState,
      currentBet: 0,
      players: {
        ...pokerState.players,
        BTN: { ...pokerState.players.BTN, committedThisStreet: 0 },
        BB: { ...pokerState.players.BB, committedThisStreet: 0 },
      },
    }
  }

  const legal = getLegalActions(pokerState, 'BTN')
  const potChips = 1000
  const potOdds =
    options.required !== undefined
      ? options.required
      : options.toCall > 0
        ? options.toCall / (potChips + options.toCall)
        : null

  return {
    pokerState,
    heroCards: ['As', 'Ad'],
    board: ['Qs', '8h', '4c'] as Card[],
    street: 'FLOP',
    position: 'BTN',
    opponentModel: { kind: 'RANDOM' },
    opponentMode: 'RANDOM',
    equity: equityResult(options.equityValue),
    potOdds,
    requiredEquity: potOdds,
    amountToCall: options.toCall,
    spr: 5,
    effectiveStack: 10_000,
    potChips,
    legal: {
      ...legal,
      fold: options.toCall > 0,
      call: options.toCall > 0,
      check: options.toCall === 0,
      bet: options.toCall === 0,
      raise: options.toCall > 0,
      amountToCall: options.toCall,
    },
  }
}

const engine = createDecisionEngine()

describe('DecisionEngine facing bet', () => {
  it('clear fold when equity << required', () => {
    const result = engine.evaluate(
      baseContext({ equityValue: 0.15, toCall: 400, required: 0.4 }),
    )
    expect(result.action).toBe('FOLD')
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.metrics.equity).toBeCloseTo(0.15)
  })

  it('clear call when equity >> required', () => {
    const result = engine.evaluate(
      baseContext({ equityValue: 0.6, toCall: 250, required: 0.25 }),
    )
    expect(result.action).toBe('CALL')
    expect(result.confidence).toBe('HIGH')
  })

  it('borderline call with LOW confidence', () => {
    const result = engine.evaluate(
      baseContext({ equityValue: 0.46, toCall: 200, required: 0.44 }),
    )
    expect(result.action).toBe('CALL')
    expect(result.confidence).toBe('LOW')
    expect(result.warnings.some((w) => w.includes('погранич') || w.includes('точности'))).toBe(
      true,
    )
  })

  it('strong equity facing bet → RAISE', () => {
    const result = engine.evaluate(
      baseContext({ equityValue: 0.8, toCall: 200, required: 0.2 }),
    )
    expect(result.action).toBe('RAISE')
    expect(result.sizing?.raiseToChips).toBeGreaterThan(0)
  })

  it('uses safety margin constant for fold boundary', () => {
    const justBelow = 0.3 - DECISION_SAFETY_MARGIN - 0.001
    const fold = engine.evaluate(
      baseContext({ equityValue: justBelow, toCall: 200, required: 0.3 }),
    )
    expect(fold.action).toBe('FOLD')
    const justAbove = 0.3 - DECISION_SAFETY_MARGIN + 0.001
    const call = engine.evaluate(
      baseContext({ equityValue: justAbove, toCall: 200, required: 0.3 }),
    )
    expect(call.action).toBe('CALL')
  })
})

describe('DecisionEngine no bet', () => {
  it('CHECK when amountToCall is 0 and equity modest', () => {
    const result = engine.evaluate(baseContext({ equityValue: 0.45, toCall: 0 }))
    expect(result.action).toBe('CHECK')
  })

  it('BET when strong equity and no bet facing', () => {
    expect(0.7).toBeGreaterThanOrEqual(BET_EQUITY_THRESHOLD)
    const result = engine.evaluate(baseContext({ equityValue: 0.7, toCall: 0 }))
    expect(result.action).toBe('BET')
    expect(result.sizing?.amountChips).toBeGreaterThan(0)
    expect(result.reasons.some((r) => r.includes('baseline'))).toBe(true)
  })

  it('RAISE threshold constant is above BET threshold', () => {
    expect(RAISE_EQUITY_THRESHOLD).toBeGreaterThan(BET_EQUITY_THRESHOLD)
  })
})

describe('DecisionEngine explanations', () => {
  it('fills metrics and reasons', () => {
    const result = engine.evaluate(
      baseContext({ equityValue: 0.62, toCall: 250, required: 0.25 }),
    )
    expect(result.reasons.length).toBeGreaterThan(0)
    expect(result.metrics.equity).toBeDefined()
    expect(result.metrics.requiredEquity).toBeDefined()
    expect(result.modelLabel).toBe('RULE_BASED_V1')
  })
})
