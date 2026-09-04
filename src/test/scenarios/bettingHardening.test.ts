import { describe, expect, it } from 'vitest'
import { applyAction } from '../../domain/game/applyAction'
import { createInitialState } from '../../domain/game/createInitialState'
import { assertStateInvariants } from '../../domain/game/invariants'
import { getLegalActions } from '../../domain/game/legalActions'
import { canPlayerRaise, canEditHandSetup } from '../../domain/game/raiseRights'
import { setHeroPosition, setPlayerStartingStackBb } from '../../domain/game/stackEdits'
import { advanceStreet, isBettingRoundComplete } from '../../domain/game/transitions'
import { getEffectiveStackChips, getPot } from '../../domain/math/pot'
import { getSpr } from '../../domain/math/spr'
import type { DomainResult, PokerState } from '../../domain/game/PokerState'
import type { PokerAction } from '../../domain/game/PokerAction'
import type { Position } from '../../domain/game/Position'

function must(result: DomainResult<PokerState>): PokerState {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.message)
  assertStateInvariants(result.state)
  return result.state
}

function act(state: PokerState, action: PokerAction): PokerState {
  return must(applyAction(state, action))
}

/** Reach flop HU: BTN vs BB (others folded, limped pot). */
function huFlop(btnStartingBb = 100, bbStartingBb = 100): PokerState {
  let state = createInitialState()
  state = must(setPlayerStartingStackBb(state, 'BTN', btnStartingBb))
  state = must(setPlayerStartingStackBb(state, 'BB', bbStartingBb))
  for (const position of ['UTG', 'HJ', 'CO'] as Position[]) {
    state = act(state, { type: 'FOLD', position })
  }
  state = act(state, { type: 'CALL', position: 'BTN' })
  state = act(state, { type: 'FOLD', position: 'SB' })
  state = act(state, { type: 'CHECK', position: 'BB' })
  return must(advanceStreet(state))
}

describe('betting round completion', () => {
  it('closes after BTN raise / SB fold / BB call and blocks further actions', () => {
    let state = createInitialState()
    for (const position of ['UTG', 'HJ', 'CO'] as Position[]) {
      state = act(state, { type: 'FOLD', position })
    }
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 250 })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CALL', position: 'BB' })

    expect(isBettingRoundComplete(state)).toBe(true)
    expect(state.actingPosition).toBeNull()
    expect(getLegalActions(state, 'BTN').roundComplete).toBe(true)

    const illegal = applyAction(state, { type: 'CHECK', position: 'BTN' })
    expect(illegal.ok).toBe(false)
    if (!illegal.ok) {
      expect(illegal.error.code).toBe('BETTING_ROUND_COMPLETE')
    }
  })

  it('check-around closes postflop', () => {
    let state = huFlop()
    expect(state.actingPosition).toBe('BB')
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = act(state, { type: 'CHECK', position: 'BTN' })

    expect(isBettingRoundComplete(state)).toBe(true)
    expect(state.actingPosition).toBeNull()
    expect(applyAction(state, { type: 'CHECK', position: 'BB' }).ok).toBe(false)
  })
})

describe('short all-in reopening', () => {
  it('does not reopen raise for players who already matched full bet', () => {
    // BB & CO deep; BTN starts 2.5 BB so after limp call has 1.5 BB behind → all-in raise to 150
    let state = createInitialState()
    state = must(setPlayerStartingStackBb(state, 'BTN', 2.5))
    state = act(state, { type: 'FOLD', position: 'UTG' })
    state = act(state, { type: 'FOLD', position: 'HJ' })
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'CALL', position: 'BTN' })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = must(advanceStreet(state))

    expect(state.players.BTN.stackChips).toBe(150)
    state = act(state, { type: 'BET', position: 'BB', amountChips: 100 })
    state = act(state, { type: 'CALL', position: 'CO' })
    expect(state.minimumRaiseTo).toBe(200)

    // BTN all-in 150 (short)
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 150 })
    expect(state.players.BTN.allIn).toBe(true)
    expect(state.currentBet).toBe(150)
    expect(state.lastFullRaiseSize).toBe(100)
    expect(state.minimumRaiseTo).toBe(250)

    expect(state.actingPosition).toBe('BB')
    expect(canPlayerRaise(state, 'BB')).toBe(false)
    expect(getLegalActions(state, 'BB').raise).toBe(false)
    expect(getLegalActions(state, 'BB').call).toBe(true)

    state = act(state, { type: 'CALL', position: 'BB' })
    expect(state.actingPosition).toBe('CO')
    expect(canPlayerRaise(state, 'CO')).toBe(false)
    expect(getLegalActions(state, 'CO').raise).toBe(false)
    expect(getLegalActions(state, 'CO').call).toBe(true)
  })

  it('player who has not yet acted may still raise after short all-in', () => {
    // HJ short-stacked; CO has not acted yet when HJ shorts
    let state = createInitialState()
    state = must(setPlayerStartingStackBb(state, 'HJ', 2.5))
    state = act(state, { type: 'CALL', position: 'UTG' })
    state = act(state, { type: 'CALL', position: 'HJ' })
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'CALL', position: 'BTN' })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = must(advanceStreet(state))

    expect(state.players.HJ.stackChips).toBe(150)
    state = act(state, { type: 'BET', position: 'BB', amountChips: 100 })
    state = act(state, { type: 'CALL', position: 'UTG' })
    state = act(state, { type: 'RAISE', position: 'HJ', raiseToChips: 150 })

    expect(state.actingPosition).toBe('CO')
    expect(state.lastActedBetLevel.CO).toBeNull()
    expect(canPlayerRaise(state, 'CO')).toBe(true)
    expect(getLegalActions(state, 'CO').raise).toBe(true)
    expect(canPlayerRaise(state, 'UTG')).toBe(false)
  })

  it('cumulative short all-ins reopen for A but not C', () => {
    // HJ shorts to 125, BTN shorts to 200; BB acted at 100, CO acted at 125
    let state = createInitialState()
    state = must(setPlayerStartingStackBb(state, 'HJ', 2.25))
    state = must(setPlayerStartingStackBb(state, 'BTN', 3))
    state = act(state, { type: 'FOLD', position: 'UTG' })
    state = act(state, { type: 'CALL', position: 'HJ' })
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'CALL', position: 'BTN' })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = must(advanceStreet(state))

    expect(state.players.HJ.stackChips).toBe(125)
    expect(state.players.BTN.stackChips).toBe(200)

    state = act(state, { type: 'BET', position: 'BB', amountChips: 100 })
    state = act(state, { type: 'RAISE', position: 'HJ', raiseToChips: 125 })
    expect(state.lastFullRaiseSize).toBe(100)
    expect(state.minimumRaiseTo).toBe(225)
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 200 })
    expect(state.currentBet).toBe(200)
    expect(state.lastFullRaiseSize).toBe(100)
    expect(state.minimumRaiseTo).toBe(300)

    expect(state.actingPosition).toBe('BB')
    expect(canPlayerRaise(state, 'BB')).toBe(true)
    expect(getLegalActions(state, 'BB').amountToCall).toBe(100)
    expect(getLegalActions(state, 'BB').raise).toBe(true)

    state = act(state, { type: 'CALL', position: 'BB' })
    expect(state.actingPosition).toBe('CO')
    expect(canPlayerRaise(state, 'CO')).toBe(false)
    expect(getLegalActions(state, 'CO').amountToCall).toBe(75)
    expect(getLegalActions(state, 'CO').raise).toBe(false)
  })

  it('full raise reopens for previous callers', () => {
    let state = createInitialState()
    state = act(state, { type: 'FOLD', position: 'UTG' })
    state = act(state, { type: 'FOLD', position: 'HJ' })
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'CALL', position: 'BTN' })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = must(advanceStreet(state))

    state = act(state, { type: 'BET', position: 'BB', amountChips: 100 })
    state = act(state, { type: 'CALL', position: 'CO' })
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 300 })

    expect(state.lastFullRaiseSize).toBe(200)
    expect(state.actingPosition).toBe('BB')
    expect(canPlayerRaise(state, 'BB')).toBe(true)
    state = act(state, { type: 'CALL', position: 'BB' })
    expect(state.actingPosition).toBe('CO')
    expect(canPlayerRaise(state, 'CO')).toBe(true)
  })

  it('min raise after short all-in stays based on last full raise size', () => {
    let state = createInitialState()
    state = must(setPlayerStartingStackBb(state, 'BTN', 2.5))
    state = act(state, { type: 'FOLD', position: 'UTG' })
    state = act(state, { type: 'FOLD', position: 'HJ' })
    state = act(state, { type: 'FOLD', position: 'CO' })
    state = act(state, { type: 'CALL', position: 'BTN' })
    state = act(state, { type: 'FOLD', position: 'SB' })
    state = act(state, { type: 'CHECK', position: 'BB' })
    state = must(advanceStreet(state))
    state = act(state, { type: 'BET', position: 'BB', amountChips: 100 })
    state = act(state, { type: 'RAISE', position: 'BTN', raiseToChips: 150 })
    expect(state.currentBet).toBe(150)
    expect(state.lastFullRaiseSize).toBe(100)
    expect(state.minimumRaiseTo).toBe(250)
  })
})

describe('effective stack and SPR', () => {
  it('uses chips behind only', () => {
    let state = huFlop()
    // After limp: BTN and BB have 9900 behind, pot 250
    expect(getEffectiveStackChips(state, 'BTN')).toBe(9900)

    state = act(state, { type: 'CHECK', position: 'BB' })
    state = act(state, { type: 'BET', position: 'BTN', amountChips: 1000 })
    // BTN behind 8900, BB behind 9900 → eff for BB decision = 8900
    expect(getEffectiveStackChips(state, 'BB')).toBe(8900)
    expect(getSpr(getEffectiveStackChips(state, 'BB'), getPot(state))).toBeCloseTo(8900 / 1250)
  })
})

describe('setup locking', () => {
  it('allows starting stack edit before voluntary action and locks after', () => {
    let state = createInitialState()
    expect(canEditHandSetup(state)).toBe(true)
    expect(state.players.BB.stackChips).toBe(9900)
    state = must(setPlayerStartingStackBb(state, 'BB', 100))
    expect(state.players.BB.startingStackChips).toBe(10000)
    expect(state.players.BB.stackChips).toBe(9900)

    state = act(state, { type: 'FOLD', position: 'UTG' })
    expect(canEditHandSetup(state)).toBe(false)
    expect(setPlayerStartingStackBb(state, 'CO', 50).ok).toBe(false)
    expect(setHeroPosition(state, 'CO').ok).toBe(false)
  })

  it('keeps economic invariant starting = stack + committedTotal', () => {
    let state = createInitialState()
    state = act(state, { type: 'RAISE', position: 'UTG', raiseToChips: 300 })
    for (const position of ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const) {
      const player = state.players[position]
      expect(player.startingStackChips).toBe(player.stackChips + player.committedTotal)
    }
    assertStateInvariants(state)
  })
})
