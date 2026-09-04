import { bbToChips, chipsToBb } from '../math/chips'
import type { DomainResult, PokerState } from './PokerState'
import type { Position } from './Position'
import { POSITIONS_6MAX } from './Position'
import { canEditHandSetup } from './raiseRights'

const MAX_STACK_BB = 1000

export function setHeroPosition(
  state: PokerState,
  heroPosition: Position,
): DomainResult<PokerState> {
  if (!canEditHandSetup(state)) {
    return {
      ok: false,
      error: { code: 'SETUP_LOCKED', message: 'Cannot change Hero after voluntary actions' },
    }
  }
  return { ok: true, state: { ...state, heroPosition } }
}

/**
 * Sets the player's starting stack in BB during hand setup.
 * Behind-the-lines stack is recomputed as starting − already posted commitments (blinds).
 */
export function setPlayerStartingStackBb(
  state: PokerState,
  position: Position,
  startingStackBb: number,
): DomainResult<PokerState> {
  if (!canEditHandSetup(state)) {
    return {
      ok: false,
      error: { code: 'SETUP_LOCKED', message: 'Cannot edit starting stacks after voluntary actions' },
    }
  }

  if (!Number.isFinite(startingStackBb) || startingStackBb <= 0 || startingStackBb > MAX_STACK_BB) {
    return {
      ok: false,
      error: { code: 'INVALID_STACK', message: 'Starting stack must be a positive BB amount' },
    }
  }

  const player = state.players[position]
  const startingStackChips = bbToChips(startingStackBb, state.bigBlind)

  if (startingStackChips < player.committedTotal) {
    return {
      ok: false,
      error: {
        code: 'INVALID_STACK',
        message: 'Starting stack cannot be below already posted blind',
      },
    }
  }

  const stackChips = startingStackChips - player.committedTotal
  const players = { ...state.players }
  players[position] = {
    ...player,
    startingStackChips,
    stackChips,
    allIn: stackChips === 0 && !player.folded,
  }

  return { ok: true, state: { ...state, players } }
}

/** @deprecated Use setPlayerStartingStackBb */
export function setPlayerStackBb(
  state: PokerState,
  position: Position,
  stackBb: number,
): DomainResult<PokerState> {
  return setPlayerStartingStackBb(state, position, stackBb)
}

export function setAllStartingStacksBb(state: PokerState, stackBb: number): DomainResult<PokerState> {
  let next: PokerState = state
  for (const position of POSITIONS_6MAX) {
    const result = setPlayerStartingStackBb(next, position, stackBb)
    if (!result.ok) {
      return result
    }
    next = result.state
  }
  return { ok: true, state: next }
}

export function getStartingStackBb(state: PokerState, position: Position): number {
  return chipsToBb(state.players[position].startingStackChips, state.bigBlind)
}
