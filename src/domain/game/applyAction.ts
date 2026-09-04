import { getPot } from '../math/pot'
import type { PokerAction, PokerActionRecord } from './PokerAction'
import type { DomainResult, LastActedBetLevel, PokerState } from './PokerState'
import type { Position } from './Position'
import { isPlayerInHand } from './PlayerState'
import { POSITION_ORDER } from './Position'
import { contenders } from './raiseRights'
import { findNextActingPosition, isBettingRoundComplete } from './transitions'
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

function markActed(list: Position[], position: Position): Position[] {
  return list.includes(position) ? list : [...list, position]
}

function withActedLevel(
  levels: LastActedBetLevel,
  position: Position,
  betLevel: number,
): LastActedBetLevel {
  return { ...levels, [position]: betLevel }
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
  let lastActedBetLevel = state.lastActedBetLevel
  let handComplete = state.handComplete

  switch (action.type) {
    case 'FOLD': {
      players[action.position] = { ...player, folded: true }
      lastActedBetLevel = withActedLevel(lastActedBetLevel, action.position, currentBet)
      break
    }
    case 'CHECK': {
      lastActedBetLevel = withActedLevel(lastActedBetLevel, action.position, currentBet)
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
      lastActedBetLevel = withActedLevel(lastActedBetLevel, action.position, currentBet)
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
      playersActedThisRound = [action.position]
      lastActedBetLevel = withActedLevel(lastActedBetLevel, action.position, currentBet)
      break
    }
    case 'RAISE': {
      /**
       * Raise is always absolute raise-to.
       * Full raise: refreshes lastFullRaiseSize and reopens raise rights via bet-level delta.
       * Short all-in: updates currentBet; lastFullRaiseSize unchanged;
       * minimumRaiseTo becomes currentBet + lastFullRaiseSize.
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
        // Short all-in: keep lastFullRaiseSize; bump min full raise-to against new currentBet.
        minimumRaiseTo = currentBet + lastFullRaiseSize
        lastAggressor = action.position
      }
      lastActedBetLevel = withActedLevel(lastActedBetLevel, action.position, currentBet)
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

  const draft: PokerState = {
    ...state,
    players,
    pot: potAfter,
    currentBet,
    minimumRaiseTo,
    lastFullRaiseSize,
    lastAggressor,
    playersActedThisRound,
    lastActedBetLevel,
    actionHistory,
    handComplete,
    actingPosition: null,
  }

  if (handComplete || contenders(draft).length <= 1) {
    return { ok: true, state: { ...draft, actingPosition: null, handComplete: true } }
  }

  if (isBettingRoundComplete(draft)) {
    return { ok: true, state: { ...draft, actingPosition: null } }
  }

  const actingPosition = findNextActingPosition(draft, action.position)
  return { ok: true, state: { ...draft, actingPosition } }
}
