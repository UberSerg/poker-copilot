import type { Card } from '../../domain/cards/Card'

export type EquityMode = 'EXACT' | 'MONTE_CARLO'

export type OpponentMode = 'EXACT' | 'RANDOM'

export interface EquityInput {
  heroCards: readonly [Card, Card]
  board: readonly Card[]
  opponentMode: OpponentMode
  /** Required when opponentMode === 'EXACT' */
  opponentCards?: readonly [Card, Card]
  /** Preferred mode; engine may override to EXACT when cheap enough. */
  preferredMode?: EquityMode
  iterations?: number
  seed?: number
}

export interface EquityResult {
  wins: number
  ties: number
  losses: number
  winProbability: number
  tieProbability: number
  lossProbability: number
  equity: number
  iterations: number
  method: EquityMode
  elapsedMs?: number
}

export type EquityErrorCode =
  | 'MISSING_HERO_CARDS'
  | 'INVALID_BOARD'
  | 'INCOMPLETE_OPPONENT_HAND'
  | 'DUPLICATE_CARD'
  | 'NO_VALID_COMBINATIONS'
  | 'UNSUPPORTED'

export interface EquityError {
  code: EquityErrorCode
  message: string
}

export type EquityOutcome = { ok: true; result: EquityResult } | { ok: false; error: EquityError }

export interface EquityEngine {
  calculate(input: EquityInput): EquityOutcome
}

/** Prefer exact when estimated board×opponent completions ≤ this threshold. */
export const MAX_EXACT_COMBINATIONS = 20_000

export const MC_PRESETS = {
  fast: 10_000,
  normal: 50_000,
  high: 200_000,
} as const
