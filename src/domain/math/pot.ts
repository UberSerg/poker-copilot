import type { PokerState } from '../game/PokerState'
import type { Position } from '../game/Position'
import { POSITIONS_6MAX } from '../game/Position'
import { isPlayerInHand } from '../game/PlayerState'

export function sumCommittedTotal(state: PokerState): number {
  return POSITIONS_6MAX.reduce((sum, position) => sum + state.players[position].committedTotal, 0)
}

export function getPot(state: PokerState): number {
  return sumCommittedTotal(state)
}

export function getAmountToCall(state: PokerState, position: Position): number {
  const player = state.players[position]
  if (player.folded) {
    return 0
  }
  const needed = state.currentBet - player.committedThisStreet
  if (needed <= 0) {
    return 0
  }
  return Math.min(needed, player.stackChips)
}

/**
 * Effective stack for the current decision = chips remaining behind Hero and
 * relevant opponents (not including already committed chips this street).
 *
 * Heads-up: min(hero.stackChips, villain.stackChips)
 * Multiway: min(hero.stackChips, min remaining contender stacks) — documented interim rule.
 */
export function getEffectiveStackChips(
  state: PokerState,
  heroPosition: Position = state.heroPosition,
): number | null {
  const hero = state.players[heroPosition]
  if (hero.folded) {
    return null
  }

  const opponents = POSITIONS_6MAX.filter(
    (position) => position !== heroPosition && isPlayerInHand(state.players[position]),
  )
  if (opponents.length === 0) {
    return null
  }

  const opponentStacks = opponents.map((position) => state.players[position].stackChips)
  return Math.min(hero.stackChips, ...opponentStacks)
}
