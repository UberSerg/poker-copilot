import type { Card } from '../../domain/cards/Card'
import type { PokerState } from '../../domain/game/PokerState'
import type { Position } from '../../domain/game/Position'
import type { Street } from '../../domain/game/Street'
import type { EquityResult } from '../equity/types'
import type { OpponentMode } from '../equity/types'
import type { LegalActionFlags } from '../../domain/game/legalActions'

export type DecisionOpponentModel =
  | { kind: 'RANDOM' }
  | { kind: 'EXACT'; cards: readonly [Card, Card] }
  | { kind: 'RANGE'; label: string; comboCount: number }

export interface DecisionContext {
  pokerState: PokerState
  heroCards: readonly [Card, Card]
  board: readonly Card[]
  street: Street
  position: Position
  opponentModel: DecisionOpponentModel
  opponentMode: OpponentMode
  equity: EquityResult
  potOdds: number | null
  /** Same as pot odds when facing a bet; required equity fraction */
  requiredEquity: number | null
  amountToCall: number
  spr: number | null
  effectiveStack: number | null
  potChips: number
  legal: LegalActionFlags
}
