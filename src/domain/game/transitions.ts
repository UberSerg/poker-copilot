import { getPot } from '../math/pot'
import type { DomainResult, PokerState } from './PokerState'
import type { Position } from './Position'
import { POSITION_ORDER, positionsAfter } from './Position'
import { nextStreet } from './Street'
import {
  activeContenders,
  contenders,
  emptyLastActedBetLevel,
  playerNeedsAction,
} from './raiseRights'

export function firstToActPostflop(state: PokerState): Position | null {
  for (const position of positionsAfter('BTN')) {
    if (playerNeedsAction(state, position)) {
      return position
    }
  }
  return null
}

/**
 * Next player who still needs a voluntary decision.
 * Returns null when the betting round is complete.
 */
export function nextActor(state: PokerState, from: Position): Position | null {
  if (isBettingRoundComplete(state)) {
    return null
  }
  for (const position of positionsAfter(from)) {
    if (playerNeedsAction(state, position)) {
      return position
    }
  }
  return null
}

export function findNextActingPosition(state: PokerState, from: Position): Position | null {
  return nextActor(state, from)
}

/**
 * Round complete when every active player has matched currentBet and has acted
 * voluntarily at least once this street (lastActedBetLevel !== null).
 * Check-around: currentBet === 0 and every active player checked.
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

  for (const position of canAct) {
    if (playerNeedsAction(state, position)) {
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

  const draft: PokerState = {
    ...state,
    players,
    street: following,
    pot: getPot({ ...state, players }),
    currentBet: 0,
    minimumRaiseTo: state.bigBlind,
    lastFullRaiseSize: state.bigBlind,
    lastAggressor: null,
    playersActedThisRound: [],
    lastActedBetLevel: emptyLastActedBetLevel(),
    actingPosition: null,
    handComplete: false,
  }

  return {
    ok: true,
    state: {
      ...draft,
      actingPosition: firstToActPostflop(draft),
    },
  }
}
