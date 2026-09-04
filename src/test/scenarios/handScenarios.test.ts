import { describe, expect, it } from 'vitest'
import { applyAction } from '../../domain/game/applyAction'
import { createInitialState } from '../../domain/game/createInitialState'
import { advanceStreet, isBettingRoundComplete } from '../../domain/game/transitions'
import { getAmountToCall, getEffectiveStackChips, getPot } from '../../domain/math/pot'
import { getSpr } from '../../domain/math/spr'
import type { PokerState } from '../../domain/game/PokerState'
import type { PokerAction } from '../../domain/game/PokerAction'
import type { DomainResult } from '../../domain/game/PokerState'

function must(result: DomainResult<PokerState>): PokerState {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  return result.state
}

function act(state: PokerState, action: PokerAction): PokerState {
  return must(applyAction(state, action))
}

describe('scenario 1: single raised pot', () => {
  it('BTN raise 2.5 BB, BB call', () => {
    let state = createInitialState()
    for (const position of ['UTG', 'HJ', 'CO'] as const) {
      state = act(state, { type: 'FOLD', position })
    }
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 250 })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CALL', position: 'BB' })

    expect(getPot(state)).toBe(550)
    expect(state.players.BTN.stackChips).toBe(9750)
    expect(state.players.BB.stackChips).toBe(9750)
    expect(state.players.BTN.committedTotal).toBe(250)
    expect(state.players.BB.committedTotal).toBe(250)
    expect(isBettingRoundComplete(state)).toBe(true)
  })
})

describe('scenario 2: 3-bet pot', () => {
  it('CO open, BTN 3-bet, CO call', () => {
    let state = createInitialState()
    state = act(state, { type: 'FOLD', position: 'UTG' })
    state = act(state, { type: 'FOLD', position: 'HJ' })
    state = act(state, { type: 'RAISE', position: 'CO', raiseToChips: 250 })
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 800 })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'FOLD', position: 'BB' })
    state = act(state, { type: 'CALL', position: 'CO' })

    // SB 50 + BB 100 + CO 800 + BTN 800 = 1750
    expect(getPot(state)).toBe(1750)
    expect(state.players.CO.stackChips).toBe(9200)
    expect(state.players.BTN.stackChips).toBe(9200)
    expect(isBettingRoundComplete(state)).toBe(true)
  })
})

describe('scenario 3: postflop bet call', () => {
  it('BB check, BTN bets half pot, BB calls', () => {
    let state = createInitialState()
    for (const position of ['UTG', 'HJ', 'CO'] as const) {
      state = act(state, { type: 'FOLD', position })
    }
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 250 })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CALL', position: 'BB' })
    state = must(advanceStreet(state))

    expect(state.street).toBe('FLOP')
    expect(state.pot).toBe(550)
    expect(state.actingPosition).toBe('BB')

    const eff = getEffectiveStackChips(state)
    const sprBefore = getSpr(eff, state.pot)
    expect(sprBefore).toBeCloseTo(9750 / 550)

    state = act(state, { type: 'CHECK', position: 'BB' })
    const halfPot = Math.round(state.pot / 2)
    state = act(state, { type: 'BET', position: 'BTN', amountChips: halfPot })
    expect(getAmountToCall(state, 'BB')).toBe(halfPot)
    state = act(state, { type: 'CALL', position: 'BB' })

    expect(state.pot).toBe(550 + halfPot * 2)
    expect(state.players.BTN.committedThisStreet).toBe(halfPot)
    expect(state.players.BB.committedThisStreet).toBe(halfPot)
    expect(isBettingRoundComplete(state)).toBe(true)
  })
})
