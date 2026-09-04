import { isPlayerActive, isPlayerInHand } from './PlayerState'
import type { PokerState } from './PokerState'
import type { Position } from './Position'
import { POSITION_ORDER, positionsAfter } from './Position'
import type { DomainResult } from './PokerState'
import { nextStreet } from './Street'
import { getPot } from '../math/pot'

function contenders(state: PokerState): Position[] {
  return POSITION_ORDER.filter((position) => isPlayerInHand(state.players[position]))
}

function activeContenders(state: PokerState): Position[] {
  return contenders(state).filter((position) => isPlayerActive(state.players[position]))
}

export function firstToActPostflop(state: PokerState): Position | null {
  for (const position of positionsAfter('BTN')) {
    if (isPlayerActive(state.players[position])) {
      return position
    }
  }
  return null
}

export function nextActor(state: PokerState, from: Position): Position | null {
  for (const position of positionsAfter(from)) {
    if (isPlayerActive(state.players[position])) {
      return position
    }
  }
  return null
}

/**
 * Betting round is complete when every non-folded, non-all-in player has matched
 * currentBet (or checked when currentBet is 0) and everyone who can act has acted
 * at least once after the last aggression (or since round start for check-around).
 */
export function isBettingRoundComplete(state: PokerState): boolean {
  if (state.handComplete) {
    return false
  }

  const inHand = contenders(state)
  if (inHand.length <= 1) {
    return true
  }

  const canAct = activeContenders(state)
  if (canAct.length === 0) {
    return true
  }

  const unmatched = canAct.filter(
    (position) => state.players[position].committedThisStreet !== state.currentBet,
  )
  if (unmatched.length > 0) {
    return false
  }

  // Everyone able to act must have acted this round
  for (const position of canAct) {
    if (!state.playersActedThisRound.includes(position)) {
      return false
    }
  }

  return true
}

export function advanceStreet(state: PokerState): DomainResult<PokerState> {
  if (!isBettingRoundComplete(state)) {
    return {
      ok: false,
      error: { code: 'STREET_NOT_COMPLETE', message: 'Betting round is not complete' },
    }
  }

  const inHand = contenders(state)
  if (inHand.length <= 1) {
    return {
      ok: true,
      state: {
        ...state,
        pot: getPot(state),
        actingPosition: null,
        handComplete: true,
      },
    }
  }

  const following = nextStreet(state.street)
  if (following === null) {
    return {
      ok: true,
      state: {
        ...state,
        pot: getPot(state),
        actingPosition: null,
        handComplete: true,
      },
    }
  }

  const players = { ...state.players }
  for (const position of POSITION_ORDER) {
    const player = players[position]
    players[position] = {
      ...player,
      committedThisStreet: 0,
    }
  }

  const next: PokerState = {
    ...state,
    players,
    street: following,
    pot: getPot({ ...state, players }),
    currentBet: 0,
    minimumRaiseTo: state.bigBlind,
    lastFullRaiseSize: state.bigBlind,
    lastAggressor: null,
    playersActedThisRound: [],
    actingPosition: firstToActPostflop({ ...state, players }),
    handComplete: false,
  }

  return { ok: true, state: next }
}
