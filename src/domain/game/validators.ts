import type { PokerAction } from './PokerAction'
import type { DomainError, PokerState } from './PokerState'
import { getAmountToCall } from '../math/pot'
import { isPlayerActive } from './PlayerState'
import { canPlayerRaise } from './raiseRights'
import { isBettingRoundComplete } from './transitions'

export function validateActor(state: PokerState, position: PokerAction['position']): DomainError | null {
  if (state.handComplete) {
    return { code: 'HAND_COMPLETE', message: 'Hand is already complete' }
  }
  if (isBettingRoundComplete(state) || state.actingPosition === null) {
    return {
      code: 'BETTING_ROUND_COMPLETE',
      message: 'Betting round is complete; advance street instead',
    }
  }
  if (state.actingPosition !== position) {
    return { code: 'WRONG_ACTOR', message: `Expected actor ${state.actingPosition}` }
  }
  const player = state.players[position]
  if (player.folded || player.allIn) {
    return { code: 'PLAYER_NOT_ACTIVE', message: `Player ${position} cannot act` }
  }
  if (!isPlayerActive(player) && player.stackChips === 0) {
    return { code: 'PLAYER_NOT_ACTIVE', message: `Player ${position} cannot act` }
  }
  return null
}

export function validateAction(state: PokerState, action: PokerAction): DomainError | null {
  if (action.type === 'POST_BLIND') {
    return { code: 'UNSUPPORTED', message: 'Blinds are posted only at hand start' }
  }

  const actorError = validateActor(state, action.position)
  if (actorError) {
    return actorError
  }

  const player = state.players[action.position]
  const toCall = getAmountToCall(state, action.position)

  switch (action.type) {
    case 'FOLD':
      return null
    case 'CHECK':
      if (toCall > 0) {
        return { code: 'ILLEGAL_CHECK', message: 'Cannot check facing a bet' }
      }
      return null
    case 'CALL':
      if (toCall <= 0) {
        return { code: 'ILLEGAL_CALL', message: 'Nothing to call' }
      }
      return null
    case 'BET': {
      if (state.currentBet > 0) {
        return { code: 'ILLEGAL_BET', message: 'Cannot bet when a bet already exists; raise instead' }
      }
      if (!Number.isInteger(action.amountChips) || action.amountChips <= 0) {
        return { code: 'ILLEGAL_BET', message: 'Bet amount must be a positive integer' }
      }
      if (action.amountChips > player.stackChips) {
        return { code: 'ILLEGAL_BET', message: 'Bet exceeds stack' }
      }
      if (action.amountChips < state.bigBlind && action.amountChips < player.stackChips) {
        return { code: 'ILLEGAL_BET', message: 'Bet below minimum' }
      }
      return null
    }
    case 'RAISE': {
      if (state.currentBet <= 0) {
        return { code: 'ILLEGAL_RAISE', message: 'Cannot raise without a current bet; bet instead' }
      }
      if (!canPlayerRaise(state, action.position)) {
        return { code: 'ILLEGAL_RAISE', message: 'Raise is not reopened for this player' }
      }
      if (!Number.isInteger(action.raiseToChips) || action.raiseToChips <= 0) {
        return { code: 'ILLEGAL_RAISE', message: 'Raise-to must be a positive integer' }
      }
      const maxRaiseTo = player.committedThisStreet + player.stackChips
      if (action.raiseToChips > maxRaiseTo) {
        return { code: 'ILLEGAL_RAISE', message: 'Raise-to exceeds stack' }
      }
      if (action.raiseToChips <= state.currentBet) {
        return { code: 'ILLEGAL_RAISE', message: 'Raise-to must exceed current bet' }
      }
      const isAllIn = action.raiseToChips === maxRaiseTo
      if (!isAllIn && action.raiseToChips < state.minimumRaiseTo) {
        return { code: 'ILLEGAL_RAISE', message: 'Raise-to below minimum raise' }
      }
      return null
    }
  }
}
