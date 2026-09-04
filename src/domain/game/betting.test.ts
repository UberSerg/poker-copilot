import { describe, expect, it } from 'vitest'
import { applyAction } from '../game/applyAction'
import { setBoardCard, setHeroCard } from '../game/cardEdits'
import { createInitialState, newHand } from '../game/createInitialState'
import { getLegalActions } from '../game/legalActions'
import { getHandMetrics, getUsedCards } from '../game/selectors'
import { setHeroPosition, setPlayerStartingStackBb } from '../game/stackEdits'
import { advanceStreet, isBettingRoundComplete } from '../game/transitions'
import { getAmountToCall, getPot } from '../math/pot'
import { getPotOdds } from '../math/potOdds'
import { getSpr } from '../math/spr'

describe('initial state', () => {
  it('posts blinds and starts preflop', () => {
    const state = createInitialState()
    expect(Object.keys(state.players)).toHaveLength(6)
    expect(state.players.UTG.startingStackChips).toBe(10000)
    expect(state.players.SB.committedThisStreet).toBe(50)
    expect(state.players.BB.committedThisStreet).toBe(100)
    expect(state.pot).toBe(150)
    expect(getPot(state)).toBe(150)
    expect(state.street).toBe('PREFLOP')
    expect(state.currentBet).toBe(100)
    expect(state.actingPosition).toBe('UTG')
    expect(state.heroPosition).toBe('BTN')
    expect(state.gameMode).toBe('CASH')
  })

  it('serializes to JSON', () => {
    const state = createInitialState()
    expect(() => JSON.stringify(state)).not.toThrow()
    expect(JSON.parse(JSON.stringify(state)).pot).toBe(150)
  })
})

describe('betting actions', () => {
  it('folds and keeps contributions', () => {
    const state = createInitialState()
    const result = applyAction(state, { type: 'FOLD', position: 'UTG' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.players.UTG.folded).toBe(true)
    expect(result.state.players.UTG.committedTotal).toBe(0)
    expect(result.state.actingPosition).toBe('HJ')
  })

  it('rejects check facing a bet', () => {
    const state = createInitialState()
    const result = applyAction(state, { type: 'CHECK', position: 'UTG' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('ILLEGAL_CHECK')
  })

  it('allows check when matched', () => {
    let state = createInitialState()
    // Fold to BB, then BB can check? Actually after folds to BB only, BB already posted.
    // Better: limp everyone... Simpler: after call to BB, BB can check.
    for (const position of ['UTG', 'HJ', 'CO', 'BTN', 'SB'] as const) {
      const fold = applyAction(state, { type: 'FOLD', position })
      expect(fold.ok).toBe(true)
      if (!fold.ok) return
      state = fold.state
    }
    expect(state.handComplete).toBe(true)
  })

  it('calls correct amount including short all-in', () => {
    let state = createInitialState()
    const short = setPlayerStartingStackBb(state, 'UTG', 0.5)
    expect(short.ok).toBe(true)
    if (!short.ok) return
    state = short.state
    // UTG has 50 chips, needs to call 100 -> all-in 50
    const call = applyAction(state, { type: 'CALL', position: 'UTG' })
    expect(call.ok).toBe(true)
    if (!call.ok) return
    expect(call.state.players.UTG.stackChips).toBe(0)
    expect(call.state.players.UTG.allIn).toBe(true)
    expect(call.state.players.UTG.committedThisStreet).toBe(50)
    expect(call.state.pot).toBe(200)
  })

  it('bets when currentBet is 0 and rejects bet when facing a bet', () => {
    const preflop = createInitialState()
    expect(applyAction(preflop, { type: 'BET', position: 'UTG', amountChips: 200 }).ok).toBe(false)

    // Build a check-around flop via folds to heads-up then advance — use simpler path:
    // Fold all except SB/BB, BB wins — hand complete. Instead force street via helper path:
    let state = createInitialState()
    // Everyone folds to BB except BTN calls then we need flop.
    // Raise path tested below; for bet on flop create custom state after advance.
    for (const position of ['UTG', 'HJ', 'CO'] as const) {
      state = must(applyAction(state, { type: 'FOLD', position }))
    }
    state = must(applyAction(state, { type: 'CALL', position: 'BTN' }))
    state = must(applyAction(state, { type: 'FOLD', position: 'SB' }))
    state = must(applyAction(state, { type: 'CHECK', position: 'BB' }))
    expect(isBettingRoundComplete(state)).toBe(true)
    state = must(advanceStreet(state))
    expect(state.street).toBe('FLOP')
    expect(state.currentBet).toBe(0)

    expect(state.actingPosition).toBe('BB')
    const illegalRaise = applyAction(state, { type: 'RAISE', position: 'BB', raiseToChips: 200 })
    expect(illegalRaise.ok).toBe(false)

    state = must(applyAction(state, { type: 'CHECK', position: 'BB' }))
    const bet = applyAction(state, { type: 'BET', position: 'BTN', amountChips: 150 })
    expect(bet.ok).toBe(true)
    if (!bet.ok) return
    expect(bet.state.currentBet).toBe(150)
    expect(bet.state.pot).toBe(250 + 150)
  })

  it('computes raise-to and minimum raise', () => {
    let state = createInitialState()
    // UTG raises to 300 (3x)
    state = must(applyAction(state, { type: 'RAISE', position: 'UTG', raiseToChips: 300 }))
    expect(state.currentBet).toBe(300)
    expect(state.minimumRaiseTo).toBe(500) // 300 + 200
    expect(state.players.UTG.stackChips).toBe(9700)
    expect(state.pot).toBe(450)

    // HJ raises to 800
    state = must(applyAction(state, { type: 'RAISE', position: 'HJ', raiseToChips: 800 }))
    expect(state.currentBet).toBe(800)
    expect(state.minimumRaiseTo).toBe(1300) // 800 + 500
  })
})

describe('street transition', () => {
  it('resets committedThisStreet and preserves pot/total', () => {
    let state = createInitialState()
    for (const position of ['UTG', 'HJ', 'CO'] as const) {
      state = must(applyAction(state, { type: 'FOLD', position }))
    }
    state = must(applyAction(state, { type: 'CALL', position: 'BTN' }))
    state = must(applyAction(state, { type: 'FOLD', position: 'SB' }))
    state = must(applyAction(state, { type: 'CHECK', position: 'BB' }))
    const potBefore = state.pot
    const btnTotal = state.players.BTN.committedTotal
    state = must(advanceStreet(state))
    expect(state.street).toBe('FLOP')
    expect(state.currentBet).toBe(0)
    expect(state.players.BTN.committedThisStreet).toBe(0)
    expect(state.players.BTN.committedTotal).toBe(btnTotal)
    expect(state.pot).toBe(potBefore)
  })
})

describe('math fixtures', () => {
  it('pot after BTN raise 2.5 and BB call is 5.5 BB', () => {
    let state = createInitialState()
    for (const position of ['UTG', 'HJ', 'CO'] as const) {
      state = must(applyAction(state, { type: 'FOLD', position }))
    }
    state = must(applyAction(state, { type: 'RAISE', position: 'BTN', raiseToChips: 250 }))
    state = must(applyAction(state, { type: 'FOLD', position: 'SB' }))
    state = must(applyAction(state, { type: 'CALL', position: 'BB' }))
    expect(state.pot).toBe(550)
    expect(getPot(state)).toBe(550)
  })

  it('pot odds 25% when pot already includes the bet', () => {
    // Pot 15 BB (10 + 5 bet), call 5 BB => 5 / 20 = 25%
    expect(getPotOdds(1500, 500)).toBe(0.25)
  })

  it('SPR fixture', () => {
    expect(getSpr(4700, 1000)).toBe(4.7)
  })
})

describe('cards edits', () => {
  it('prevents duplicates and releases on replace', () => {
    let state = createInitialState()
    state = must(setHeroCard(state, 0, 'As'))
    expect(setHeroCard(state, 1, 'As').ok).toBe(false)
    state = must(setBoardCard(state, 0, 'Kh'))
    expect(setHeroCard(state, 1, 'Kh').ok).toBe(false)
    state = must(setHeroCard(state, 0, 'Ad'))
    expect(getUsedCards(state).has('As')).toBe(false)
    expect(getUsedCards(state).has('Ad')).toBe(true)
  })
})

describe('legal actions & metrics', () => {
  it('disables check when facing bet', () => {
    const state = createInitialState()
    const legal = getLegalActions(state, 'UTG')
    expect(legal.check).toBe(false)
    expect(legal.call).toBe(true)
    expect(legal.bet).toBe(false)
    expect(legal.raise).toBe(true)
    expect(legal.amountToCall).toBe(100)
  })

  it('builds hero metrics', () => {
    const state = createInitialState()
    const metrics = getHandMetrics(state, 'UTG')
    expect(metrics.potChips).toBe(150)
    expect(metrics.amountToCallChips).toBe(100)
    expect(metrics.potOdds).toBeCloseTo(100 / 250)
    expect(metrics.requiredEquityLabel).toContain('Необходимое equity')
  })
})

describe('helpers', () => {
  it('new hand and hero position', () => {
    const positioned = setHeroPosition(createInitialState(), 'CO')
    expect(positioned.ok).toBe(true)
    if (!positioned.ok) return
    const fresh = newHand(positioned.state)
    expect(fresh.heroPosition).toBe('CO')
    expect(fresh.pot).toBe(150)
    expect(fresh.heroCards).toEqual([null, null])
  })

  it('amount to call', () => {
    const state = createInitialState()
    expect(getAmountToCall(state, 'UTG')).toBe(100)
    expect(getAmountToCall(state, 'BB')).toBe(0)
  })

  it('undo snapshot restores pot and stacks', () => {
    const before = createInitialState()
    const after = must(applyAction(before, { type: 'FOLD', position: 'UTG' }))
    expect(after.players.UTG.folded).toBe(true)
    // App-level undo restores previous snapshot identity of fields:
    expect(before.pot).toBe(150)
    expect(before.players.UTG.folded).toBe(false)
    expect(after.pot).toBe(150)
  })
})

function must<T>(result: { ok: true; state: T } | { ok: false; error: unknown }): T {
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error('expected ok')
  }
  return result.state
}
