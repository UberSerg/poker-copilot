import type { GameMode } from './GameMode'
import type { BoardCards, HeroCards, PokerActionRecord } from './PokerAction'
import type { PlayerState } from './PlayerState'
import type { Position } from './Position'
import type { Street } from './Street'

export interface PokerState {
  gameMode: Extract<GameMode, 'CASH'>
  smallBlind: number
  bigBlind: number
  heroPosition: Position
  players: Record<Position, PlayerState>
  heroCards: HeroCards
  board: BoardCards
  street: Street
  /** Kept in sync with sum(committedTotal); selectors may recompute for invariants. */
  pot: number
  currentBet: number
  /**
   * Minimum legal raise-to amount (absolute chips to put in as the new currentBet).
   * Updated on full raises; short all-in raises do not re-open a full raise size.
   */
  minimumRaiseTo: number
  /** Size of the last full raise increment (for NLHE min-raise). */
  lastFullRaiseSize: number
  actingPosition: Position | null
  lastAggressor: Position | null
  playersActedThisRound: Position[]
  actionHistory: PokerActionRecord[]
  handComplete: boolean
}

export type DomainErrorCode =
  | 'ILLEGAL_FOLD'
  | 'ILLEGAL_CHECK'
  | 'ILLEGAL_CALL'
  | 'ILLEGAL_BET'
  | 'ILLEGAL_RAISE'
  | 'WRONG_ACTOR'
  | 'PLAYER_NOT_ACTIVE'
  | 'DUPLICATE_CARD'
  | 'INVALID_STACK'
  | 'STREET_NOT_COMPLETE'
  | 'HAND_COMPLETE'
  | 'UNSUPPORTED'

export interface DomainError {
  code: DomainErrorCode
  message: string
}

export type DomainResult<T> = { ok: true; state: T } | { ok: false; error: DomainError }
