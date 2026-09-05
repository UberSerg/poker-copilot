import { describe, expect, it } from 'vitest'
import type { Card } from '../../domain/cards/Card'
import { createInitialState } from '../../domain/game/createInitialState'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerState } from '../../domain/game/PokerState'
import {
  analyzeBetContext,
  analyzeBoardTexture,
  analyzeHandContext,
  analyzePositionContext,
} from '../analysis'
import type { DecisionContext } from './DecisionContext'
import { createDecisionEngine } from './DecisionEngine'
import type { EquityResult } from '../equity/types'
import {
  BET_EQUITY_THRESHOLD,
  DECISION_SAFETY_MARGIN,
  RAISE_EQUITY_THRESHOLD,
} from './constants'
import { calculateConfidence } from './confidence'

function equityResult(equity: number): EquityResult {
  return {
    wins: Math.round(equity * 1000),
    ties: 0,
    losses: Math.round((1 - equity) * 1000),
    winProbability: equity,
    tieProbability: 0,
    lossProbability: 1 - equity,
    equity,
    iterations: 1000,
    method: 'EXACT',
  }
}

function enrich(partial: {
  equityValue: number
  toCall: number
  required?: number
  hero?: readonly [Card, Card]
  board?: Card[]
  opponentMode?: DecisionContext['opponentMode']
  street?: DecisionContext['street']
}): DecisionContext {
  const hero = partial.hero ?? (['As', 'Ad'] as const)
  const board = partial.board ?? (['Qs', '8h', '4c'] as Card[])
  const state = createInitialState({ heroPosition: 'BTN' })
  const pokerState: PokerState = {
    ...state,
    street: partial.street ?? 'FLOP',
    actingPosition: 'BTN',
    currentBet: partial.toCall > 0 ? partial.toCall : 0,
    players: {
      ...state.players,
      BTN: { ...state.players.BTN, committedThisStreet: 0, stackChips: 10_000 },
      BB: {
        ...state.players.BB,
        committedThisStreet: partial.toCall > 0 ? partial.toCall : 0,
        stackChips: 9900,
      },
    },
  }
  const legal = getLegalActions(pokerState, 'BTN')
  const potChips = 1000
  const potOdds =
    partial.required !== undefined
      ? partial.required
      : partial.toCall > 0
        ? partial.toCall / (potChips + partial.toCall)
        : null
  const opponentMode = partial.opponentMode ?? 'RANDOM'

  return {
    pokerState,
    heroCards: hero,
    board,
    street: partial.street ?? 'FLOP',
    position: 'BTN',
    opponentModel:
      opponentMode === 'RANGE'
        ? { kind: 'RANGE', label: 'test', comboCount: 50 }
        : opponentMode === 'EXACT'
          ? { kind: 'EXACT', cards: ['Ks', 'Kh'] }
          : { kind: 'RANDOM' },
    opponentMode,
    equity: equityResult(partial.equityValue),
    potOdds,
    requiredEquity: potOdds,
    amountToCall: partial.toCall,
    spr: 5,
    effectiveStack: 10_000,
    potChips,
    legal: {
      ...legal,
      fold: partial.toCall > 0,
      call: partial.toCall > 0,
      check: partial.toCall === 0,
      bet: partial.toCall === 0,
      raise: partial.toCall > 0,
      amountToCall: partial.toCall,
    },
    boardTexture: analyzeBoardTexture(board),
    handContext: analyzeHandContext(hero, board),
    positionContext: analyzePositionContext('BTN'),
    betContext: analyzeBetContext(potChips, partial.toCall),
  }
}

const engine = createDecisionEngine()

describe('DecisionEngine facing bet', () => {
  it('clear fold when equity << required', () => {
    const result = engine.evaluate(
      enrich({ equityValue: 0.15, toCall: 400, required: 0.4, hero: ['7c', '2d'] }),
    )
    expect(result.action).toBe('FOLD')
    expect(result.audit.rulesTriggered).toContain('FOLD_EQUITY_DISADVANTAGE')
    expect(result.explanationSections.length).toBeGreaterThan(0)
  })

  it('clear call when equity >> required', () => {
    const result = engine.evaluate(
      enrich({
        equityValue: 0.6,
        toCall: 250,
        required: 0.25,
        hero: ['As', 'Qd'],
        board: ['Qs', '8h', '3c'],
      }),
    )
    expect(result.action).toBe('CALL')
    expect(['HIGH', 'MEDIUM']).toContain(result.confidence)
  })

  it('borderline call with LOW confidence', () => {
    const result = engine.evaluate(
      enrich({ equityValue: 0.46, toCall: 200, required: 0.44 }),
    )
    expect(result.action).toBe('CALL')
    expect(result.confidence).toBe('LOW')
  })

  it('strong equity facing bet → RAISE', () => {
    const result = engine.evaluate(
      enrich({ equityValue: 0.8, toCall: 200, required: 0.2 }),
    )
    expect(result.action).toBe('RAISE')
    expect(result.sizing?.raiseToChips).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.includes('реакции'))).toBe(true)
  })

  it('uses safety margin constant for fold boundary', () => {
    const fold = engine.evaluate(
      enrich({
        equityValue: 0.3 - DECISION_SAFETY_MARGIN - 0.001,
        toCall: 200,
        required: 0.3,
        hero: ['7c', '2d'],
      }),
    )
    expect(fold.action).toBe('FOLD')
  })
})

describe('DecisionEngine no bet', () => {
  it('CHECK when amountToCall is 0 and equity modest', () => {
    expect(engine.evaluate(enrich({ equityValue: 0.45, toCall: 0 })).action).toBe('CHECK')
  })

  it('BET when strong equity and no bet facing', () => {
    expect(0.7).toBeGreaterThanOrEqual(BET_EQUITY_THRESHOLD)
    const result = engine.evaluate(enrich({ equityValue: 0.7, toCall: 0 }))
    expect(result.action).toBe('BET')
  })

  it('wet board bet adds warning', () => {
    const result = engine.evaluate(
      enrich({
        equityValue: 0.72,
        toCall: 0,
        board: ['Js', 'Ts', '9d'],
      }),
    )
    expect(result.action).toBe('BET')
    expect(result.warnings.some((w) => w.includes('улучшений'))).toBe(true)
  })

  it('RAISE threshold above BET', () => {
    expect(RAISE_EQUITY_THRESHOLD).toBeGreaterThan(BET_EQUITY_THRESHOLD)
  })
})

describe('Confidence V2', () => {
  it('exact opponent scores higher than random', () => {
    const exact = calculateConfidence({
      equity: 0.7,
      required: 0.3,
      opponentMode: 'EXACT',
      street: 'RIVER',
      handStrength: 'STRONG',
    })
    const random = calculateConfidence({
      equity: 0.7,
      required: 0.3,
      opponentMode: 'RANDOM',
      street: 'FLOP',
      handStrength: 'MEDIUM',
    })
    const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 }
    expect(rank[exact]).toBeGreaterThanOrEqual(rank[random])
  })
})

describe('Explanation + audit', () => {
  it('fills sections, metrics, audit', () => {
    const result = engine.evaluate(
      enrich({ equityValue: 0.62, toCall: 250, required: 0.25 }),
    )
    expect(result.explanationSections.some((s) => s.title === 'Математика')).toBe(true)
    expect(result.explanationSections.some((s) => s.title === 'Контекст')).toBe(true)
    expect(result.audit.finalAction).toBe(result.action)
    expect(result.audit.rulesChecked.length).toBeGreaterThan(0)
  })
})
