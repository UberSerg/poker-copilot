import type { Position } from './Position'

export interface PlayerState {
  position: Position
  startingStackChips: number
  stackChips: number
  folded: boolean
  allIn: boolean
  committedThisStreet: number
  committedTotal: number
}

export function isPlayerActive(player: PlayerState): boolean {
  return !player.folded && !player.allIn && player.stackChips > 0
}

export function isPlayerInHand(player: PlayerState): boolean {
  return !player.folded
}
