import { getAmountToCall } from '../math/pot'
import type { PokerState } from './PokerState'
import type { Position } from './Position'
import { canPlayerRaise } from './raiseRights'
import { isBettingRoundComplete } from './transitions'
import { validateAction } from './validators'

export interface LegalActionFlags {
  fold: boolean
  check: boolean
  call: boolean
  bet: boolean
  raise: boolean
  amountToCall: number
  minimumRaiseTo: number
  maxBetOrRaiseTo: number
  roundComplete: boolean
}

export function getLegalActions(state: PokerState, position: Position): LegalActionFlags {
  const player = state.players[position]
  const amountToCall = getAmountToCall(state, position)
  const maxBetOrRaiseTo = player.committedThisStreet + player.stackChips
  const roundComplete = isBettingRoundComplete(state) || state.actingPosition === null

  if (roundComplete || state.handComplete) {
    return {
      fold: false,
      check: false,
      call: false,
      bet: false,
      raise: false,
      amountToCall,
      minimumRaiseTo: state.minimumRaiseTo,
      maxBetOrRaiseTo,
      roundComplete: true,
    }
  }

  const fold = validateAction(state, { type: 'FOLD', position }) === null
  const check = validateAction(state, { type: 'CHECK', position }) === null
  const call = validateAction(state, { type: 'CALL', position }) === null

  const openBet = Math.min(state.bigBlind, player.stackChips)
  const bet =
    validateAction(state, { type: 'BET', position, amountChips: openBet }) === null &&
    player.stackChips > 0

  const raiseAllowed = canPlayerRaise(state, position)
  const candidateRaiseTo = Math.max(state.minimumRaiseTo, state.currentBet + 1)
  const raiseTo = Math.min(candidateRaiseTo, maxBetOrRaiseTo)
  const raise =
    raiseAllowed &&
    player.stackChips > 0 &&
    validateAction(state, { type: 'RAISE', position, raiseToChips: raiseTo }) === null

  return {
    fold,
    check,
    call,
    bet,
    raise,
    amountToCall,
    minimumRaiseTo: state.minimumRaiseTo,
    maxBetOrRaiseTo,
    roundComplete: false,
  }
}
