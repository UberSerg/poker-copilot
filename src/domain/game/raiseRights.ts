import type { LastActedBetLevel, PokerState } from './PokerState'
import type { Position } from './Position'
import { POSITIONS_6MAX } from './Position'
import { isPlayerActive, isPlayerInHand } from './PlayerState'

export function emptyLastActedBetLevel(): LastActedBetLevel {
  return Object.fromEntries(POSITIONS_6MAX.map((position) => [position, null])) as LastActedBetLevel
}

/** Whether the player still owes a voluntary decision this betting round. */
export function playerNeedsAction(state: PokerState, position: Position): boolean {
  const player = state.players[position]
  if (!isPlayerActive(player)) {
    return false
  }
  if (state.lastActedBetLevel[position] === null) {
    return true
  }
  return player.committedThisStreet < state.currentBet
}

/**
 * Raise is reopened for a player who already acted only if the wager has increased
 * by at least lastFullRaiseSize since their last action.
 * Players who have not yet acted this street retain full raise rights.
 */
export function canPlayerRaise(state: PokerState, position: Position): boolean {
  const player = state.players[position]
  if (!isPlayerActive(player) || player.stackChips <= 0) {
    return false
  }
  if (state.currentBet <= 0) {
    return false
  }

  const lastLevel = state.lastActedBetLevel[position]
  if (lastLevel === null) {
    return true
  }

  const increaseFaced = state.currentBet - lastLevel
  return increaseFaced >= state.lastFullRaiseSize
}

export function contenders(state: PokerState): Position[] {
  return POSITIONS_6MAX.filter((position) => isPlayerInHand(state.players[position]))
}

export function activeContenders(state: PokerState): Position[] {
  return contenders(state).filter((position) => isPlayerActive(state.players[position]))
}

/** True when only POST_BLIND entries exist (setup still editable). */
export function canEditHandSetup(state: PokerState): boolean {
  return state.actionHistory.every((record) => record.action.type === 'POST_BLIND')
}
