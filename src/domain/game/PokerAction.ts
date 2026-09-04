import type { Card } from '../cards/Card'
import type { Position } from './Position'
import type { Street } from './Street'

export type FoldAction = {
  type: 'FOLD'
  position: Position
}

export type CheckAction = {
  type: 'CHECK'
  position: Position
}

export type CallAction = {
  type: 'CALL'
  position: Position
}

export type BetAction = {
  type: 'BET'
  position: Position
  amountChips: number
}

export type RaiseAction = {
  type: 'RAISE'
  position: Position
  raiseToChips: number
}

export type BlindAction = {
  type: 'POST_BLIND'
  position: Position
  amountChips: number
  blind: 'SB' | 'BB'
}

export type PokerAction =
  | FoldAction
  | CheckAction
  | CallAction
  | BetAction
  | RaiseAction
  | BlindAction

export interface PokerActionRecord {
  sequence: number
  street: Street
  position: Position
  action: PokerAction
  potBefore: number
  potAfter: number
  stackBefore: number
  stackAfter: number
}

export type BoardCards = [
  Card | null,
  Card | null,
  Card | null,
  Card | null,
  Card | null,
]

export type HeroCards = [Card | null, Card | null]
