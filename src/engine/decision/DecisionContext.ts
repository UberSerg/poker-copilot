import type { Card } from '../../domain/cards/Card'
import type { LegalActionFlags } from '../../domain/game/legalActions'
import type { PokerState } from '../../domain/game/PokerState'
import type { Position } from '../../domain/game/Position'
import type { Street } from '../../domain/game/Street'
import type { BoardTexture } from '../analysis/boardTexture/BoardTextureAnalyzer'
import type { BetContext } from '../analysis/betContext/BetContextAnalyzer'
import type { HandContext } from '../analysis/handContext/HandContextAnalyzer'
import type { PositionContext } from '../analysis/positionContext/PositionContextAnalyzer'
import type { EquityResult, OpponentMode } from '../equity/types'

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
  requiredEquity: number | null
  amountToCall: number
  spr: number | null
  effectiveStack: number | null
  potChips: number
  legal: LegalActionFlags
  boardTexture: BoardTexture
  handContext: HandContext
  positionContext: PositionContext
  betContext: BetContext
}
