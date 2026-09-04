import type { GameMode } from './GameMode'
import type { BoardCards, HeroCards, PokerActionRecord } from './PokerAction'
import type { PlayerState } from './PlayerState'
import type { Position } from './Position'
import type { Street } from './Street'

/**
 * Bet level (currentBet) at which the player last voluntarily acted this street.
 * `null` = has not voluntarily acted yet (blinds do not count).
 */
export type LastActedBetLevel = Record<Position, number | null>

export interface PokerState {
  gameMode: Extract<GameMode, 'CASH'>
  smallBlind: number
  bigBlind: number
  heroPosition: Position
  players: Record<Position, PlayerState>
  heroCards: HeroCards
  /** Exact villain hole cards for showdown/equity; nulls mean unset. */
  opponentCards: HeroCards
  board: BoardCards
  street: Street
  /** Cached convenience; must equal sum(committedTotal). */
  pot: number
  currentBet: number
  /**
   * Minimum legal full raise-to (absolute chips).
   * After a short all-in: currentBet + lastFullRaiseSize (lastFullRaiseSize unchanged).
   */
  minimumRaiseTo: number
  /** Size of the last full raise increment (for NLHE min-raise / reopening). */
  lastFullRaiseSize: number
  actingPosition: Position | null
  lastAggressor: Position | null
  /** Secondary/derived; prefer lastActedBetLevel for completion & raise rights. */
  playersActedThisRound: Position[]
  lastActedBetLevel: LastActedBetLevel
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
  | 'BETTING_ROUND_COMPLETE'
  | 'SETUP_LOCKED'
  | 'HAND_COMPLETE'
  | 'UNSUPPORTED'

export interface DomainError {
  code: DomainErrorCode
  message: string
}

export type DomainResult<T> = { ok: true; state: T } | { ok: false; error: DomainError }
