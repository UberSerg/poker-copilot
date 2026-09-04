import { getPot } from '../math/pot'
import type { PokerAction, PokerActionRecord } from './PokerAction'
import type { DomainResult, PokerState } from './PokerState'
import type { Position } from './Position'
import { isPlayerInHand } from './PlayerState'
import { POSITION_ORDER } from './Position'
import { nextActor } from './transitions'
import { validateAction } from './validators'

function clonePlayers(state: PokerState): PokerState['players'] {
  const players = { ...state.players }
  for (const position of POSITION_ORDER) {
    players[position] = { ...players[position] }
  }
  return players
}

function appendHistory(
  state: PokerState,
  action: PokerAction,
  stackBefore: number,
  stackAfter: number,
  potBefore: number,
  potAfter: number,
): PokerActionRecord[] {
  return [
    ...state.actionHistory,
    {
      sequence: state.actionHistory.length + 1,
      street: state.street,
      position: action.position,
      action,
      potBefore,
      potAfter,
      stackBefore,
      stackAfter,
    },
  ]
}

function afterActionActor(
  state: PokerState,
  actor: Position,
  players: PokerState['players'],
  lastAggressor: Position | null,
  playersActedThisRound: Position[],
): Position | null {
  const draft: PokerState = {
    ...state,
    players,
    lastAggressor,
    playersActedThisRound,
  }

  const inHand = POSITION_ORDER.filter((position) => isPlayerInHand(players[position]))
  if (inHand.length <= 1) {
    return null
  }

  return nextActor(draft, actor)
}

function markActed(list: Position[], position: Position): Position[] {
  return list.includes(position) ? list : [...list, position]
}

export function applyAction(state: PokerState, action: PokerAction): DomainResult<PokerState> {
  const error = validateAction(state, action)
  if (error) {
    return { ok: false, error }
  }

  const players = clonePlayers(state)
  const player = players[action.position]
  const potBefore = getPot(state)
  const stackBefore = player.stackChips

  let lastAggressor = state.lastAggressor
  let currentBet = state.currentBet
  let minimumRaiseTo = state.minimumRaiseTo
  let lastFullRaiseSize = state.lastFullRaiseSize
  let playersActedThisRound = markActed(state.playersActedThisRound, action.position)
  let handComplete = state.handComplete

  switch (action.type) {
    case 'FOLD': {
      players[action.position] = { ...player, folded: true }
      break
    }
    case 'CHECK': {
      break
    }
    case 'CALL': {
      const needed = Math.min(currentBet - player.committedThisStreet, player.stackChips)
      const stackChips = player.stackChips - needed
      players[action.position] = {
        ...player,
        stackChips,
        committedThisStreet: player.committedThisStreet + needed,
        committedTotal: player.committedTotal + needed,
        allIn: stackChips === 0,
      }
      break
    }
    case 'BET': {
      const amount = action.amountChips
      const stackChips = player.stackChips - amount
      players[action.position] = {
        ...player,
        stackChips,
        committedThisStreet: player.committedThisStreet + amount,
        committedTotal: player.committedTotal + amount,
        allIn: stackChips === 0,
      }
      currentBet = players[action.position].committedThisStreet
      lastFullRaiseSize = currentBet
      minimumRaiseTo = currentBet + lastFullRaiseSize
      lastAggressor = action.position
      // New aggression re-opens action for others
      playersActedThisRound = [action.position]
      break
    }
    case 'RAISE': {
      /**
       * Raise is always absolute raise-to.
       * Full raise: raiseTo - currentBet >= lastFullRaiseSize (or meets minimumRaiseTo).
       * Short all-in raise: may be below min-raise; updates currentBet but does not
       * refresh lastFullRaiseSize / full minimumRaiseTo window for remaining players.
       */
      const raiseTo = action.raiseToChips
      const add = raiseTo - player.committedThisStreet
      const stackChips = player.stackChips - add
      players[action.position] = {
        ...player,
        stackChips,
        committedThisStreet: raiseTo,
        committedTotal: player.committedTotal + add,
        allIn: stackChips === 0,
      }

      const raiseSize = raiseTo - currentBet
      const isFullRaise = raiseTo >= minimumRaiseTo
      currentBet = raiseTo
      if (isFullRaise) {
        lastFullRaiseSize = raiseSize
        minimumRaiseTo = currentBet + lastFullRaiseSize
        lastAggressor = action.position
        playersActedThisRound = [action.position]
      } else {
        // Short all-in: does not reopen full raise sizing; others still need to match currentBet
        lastAggressor = action.position
        playersActedThisRound = [action.position]
      }
      break
    }
    case 'POST_BLIND': {
      return { ok: false, error: { code: 'UNSUPPORTED', message: 'Cannot post blinds mid-hand' } }
    }
  }

  const potAfter = Object.values(players).reduce((sum, item) => sum + item.committedTotal, 0)
  const stackAfter = players[action.position].stackChips
  const actionHistory = appendHistory(state, action, stackBefore, stackAfter, potBefore, potAfter)

  const inHand = POSITION_ORDER.filter((position) => isPlayerInHand(players[position]))
  if (inHand.length <= 1) {
    handComplete = true
  }

  const actingPosition = handComplete
    ? null
    : afterActionActor(state, action.position, players, lastAggressor, playersActedThisRound)

  const nextState: PokerState = {
    ...state,
    players,
    pot: potAfter,
    currentBet,
    minimumRaiseTo,
    lastFullRaiseSize,
    lastAggressor,
    playersActedThisRound,
    actingPosition,
    actionHistory,
    handComplete,
  }

  return { ok: true, state: nextState }
}
