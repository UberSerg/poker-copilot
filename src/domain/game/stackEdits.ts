import { bbToChips } from '../math/chips'
import type { DomainResult, PokerState } from './PokerState'
import type { Position } from './Position'
import { POSITIONS_6MAX } from './Position'

const MAX_STACK_BB = 1000

export function setHeroPosition(state: PokerState, heroPosition: Position): PokerState {
  return { ...state, heroPosition }
}

export function setPlayerStackBb(
  state: PokerState,
  position: Position,
  stackBb: number,
): DomainResult<PokerState> {
  if (!Number.isFinite(stackBb) || stackBb <= 0 || stackBb > MAX_STACK_BB) {
    return {
      ok: false,
      error: { code: 'INVALID_STACK', message: 'Stack must be a positive BB amount' },
    }
  }

  const player = state.players[position]
  const committedLocked = player.committedTotal
  const desiredTotal = bbToChips(stackBb, state.bigBlind)

  // Interpret stackBb as remaining stack behind (display), not starting stack.
  // Minimum remaining is 0; starting stack reconstructs as remaining + committedTotal.
  if (desiredTotal < 0) {
    return { ok: false, error: { code: 'INVALID_STACK', message: 'Stack cannot be negative' } }
  }

  const stackChips = desiredTotal
  const startingStackChips = stackChips + committedLocked

  const players = { ...state.players }
  players[position] = {
    ...player,
    stackChips,
    startingStackChips,
    allIn: stackChips === 0 && !player.folded,
  }

  return { ok: true, state: { ...state, players } }
}

export function setAllStacksBb(state: PokerState, stackBb: number): DomainResult<PokerState> {
  let next: PokerState = state
  for (const position of POSITIONS_6MAX) {
    const result = setPlayerStackBb(next, position, stackBb)
    if (!result.ok) {
      return result
    }
    next = result.state
  }
  return { ok: true, state: next }
}
