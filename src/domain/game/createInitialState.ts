import type { PlayerState } from './PlayerState'
import type { Position } from './Position'
import { POSITIONS_6MAX } from './Position'
import type { PokerActionRecord } from './PokerAction'
import type { PokerState } from './PokerState'
import { emptyLastActedBetLevel } from './raiseRights'

export const DEFAULT_SMALL_BLIND = 50
export const DEFAULT_BIG_BLIND = 100
export const DEFAULT_STARTING_STACK_BB = 100
export const DEFAULT_HERO_POSITION: Position = 'BTN'

function createPlayer(position: Position, startingStackChips: number): PlayerState {
  return {
    position,
    startingStackChips,
    stackChips: startingStackChips,
    folded: false,
    allIn: false,
    committedThisStreet: 0,
    committedTotal: 0,
  }
}

function postBlind(
  players: Record<Position, PlayerState>,
  position: Position,
  amount: number,
): { players: Record<Position, PlayerState>; posted: number } {
  const player = players[position]
  const posted = Math.min(amount, player.stackChips)
  const stackChips = player.stackChips - posted
  return {
    players: {
      ...players,
      [position]: {
        ...player,
        stackChips,
        committedThisStreet: posted,
        committedTotal: posted,
        allIn: stackChips === 0,
      },
    },
    posted,
  }
}

export function createInitialState(options?: {
  heroPosition?: Position
  smallBlind?: number
  bigBlind?: number
  startingStackBb?: number
  startingStacksBb?: Partial<Record<Position, number>>
}): PokerState {
  const smallBlind = options?.smallBlind ?? DEFAULT_SMALL_BLIND
  const bigBlind = options?.bigBlind ?? DEFAULT_BIG_BLIND
  const defaultStartingBb = options?.startingStackBb ?? DEFAULT_STARTING_STACK_BB
  const heroPosition = options?.heroPosition ?? DEFAULT_HERO_POSITION

  let players = Object.fromEntries(
    POSITIONS_6MAX.map((position) => {
      const stackBb = options?.startingStacksBb?.[position] ?? defaultStartingBb
      return [position, createPlayer(position, stackBb * bigBlind)]
    }),
  ) as Record<Position, PlayerState>

  const sbStart = players.SB.startingStackChips
  const bbStart = players.BB.startingStackChips

  const sb = postBlind(players, 'SB', smallBlind)
  players = sb.players
  const bb = postBlind(players, 'BB', bigBlind)
  players = bb.players

  const pot = sb.posted + bb.posted
  const actionHistory: PokerActionRecord[] = [
    {
      sequence: 1,
      street: 'PREFLOP',
      position: 'SB',
      action: { type: 'POST_BLIND', position: 'SB', amountChips: sb.posted, blind: 'SB' },
      potBefore: 0,
      potAfter: sb.posted,
      stackBefore: sbStart,
      stackAfter: players.SB.stackChips,
    },
    {
      sequence: 2,
      street: 'PREFLOP',
      position: 'BB',
      action: { type: 'POST_BLIND', position: 'BB', amountChips: bb.posted, blind: 'BB' },
      potBefore: sb.posted,
      potAfter: pot,
      stackBefore: bbStart,
      stackAfter: players.BB.stackChips,
    },
  ]

  return {
    gameMode: 'CASH',
    smallBlind,
    bigBlind,
    heroPosition,
    players,
    heroCards: [null, null],
    board: [null, null, null, null, null],
    street: 'PREFLOP',
    pot,
    currentBet: Math.max(players.SB.committedThisStreet, players.BB.committedThisStreet),
    minimumRaiseTo: bigBlind * 2,
    lastFullRaiseSize: bigBlind,
    actingPosition: 'UTG',
    lastAggressor: 'BB',
    playersActedThisRound: [],
    lastActedBetLevel: emptyLastActedBetLevel(),
    actionHistory,
    handComplete: false,
  }
}

export function newHand(previous?: Pick<PokerState, 'heroPosition' | 'smallBlind' | 'bigBlind'>): PokerState {
  return createInitialState({
    heroPosition: previous?.heroPosition,
    smallBlind: previous?.smallBlind,
    bigBlind: previous?.bigBlind,
  })
}
