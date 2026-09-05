import type { PokerState } from '../../../domain/game/PokerState'
import { validateAction } from '../../../domain/game/validators'
import type { DecisionContext } from '../DecisionContext'
import type { DecisionSizing } from '../DecisionResult'
import {
  BET_POT_FRACTIONS,
  DEFAULT_BET_POT_FRACTION,
  RAISE_TO_MULTIPLIER,
} from '../constants'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Pick a legal BET size near the default pot fraction.
 * Returns null if no legal bet exists.
 */
export function resolveBetSizing(context: DecisionContext): DecisionSizing | null {
  const { pokerState: state, position, potChips, legal } = context
  if (!legal.bet) return null

  const player = state.players[position]
  const maxBet = player.stackChips
  if (maxBet <= 0) return null

  const preferred = [...BET_POT_FRACTIONS].sort(
    (a, b) => Math.abs(a - DEFAULT_BET_POT_FRACTION) - Math.abs(b - DEFAULT_BET_POT_FRACTION),
  )

  for (const fraction of preferred) {
    let amount = Math.round(potChips * fraction)
    amount = clamp(amount, 1, maxBet)
    // Prefer at least BB when possible
    if (amount < state.bigBlind && maxBet >= state.bigBlind) {
      amount = state.bigBlind
    }
    const error = validateAction(state, { type: 'BET', position, amountChips: amount })
    if (error === null) {
      return {
        amountChips: amount,
        potFraction: potChips > 0 ? amount / potChips : fraction,
      }
    }
  }

  // All-in fallback
  const allIn = maxBet
  if (validateAction(state, { type: 'BET', position, amountChips: allIn }) === null) {
    return {
      amountChips: allIn,
      potFraction: potChips > 0 ? allIn / potChips : 1,
    }
  }
  return null
}

/**
 * Deterministic raise-to ≈ 2.5× current bet, clamped to legal min/max.
 */
export function resolveRaiseSizing(context: DecisionContext): DecisionSizing | null {
  const { pokerState: state, position, legal } = context
  if (!legal.raise) return null

  const target = Math.round(state.currentBet * RAISE_TO_MULTIPLIER)
  const raiseTo = clamp(target, legal.minimumRaiseTo, legal.maxBetOrRaiseTo)
  if (raiseTo <= state.currentBet) return null

  const error = validateAction(state, {
    type: 'RAISE',
    position,
    raiseToChips: raiseTo,
  })
  if (error !== null) {
    // Try minimum raise / all-in
    const fallback = legal.maxBetOrRaiseTo
    if (
      validateAction(state, { type: 'RAISE', position, raiseToChips: fallback }) === null
    ) {
      return {
        amountChips: fallback - state.players[position].committedThisStreet,
        potFraction: 0,
        raiseToChips: fallback,
      }
    }
    return null
  }

  return {
    amountChips: raiseTo - state.players[position].committedThisStreet,
    potFraction: 0,
    raiseToChips: raiseTo,
  }
}

export function isActionLegal(
  state: PokerState,
  position: DecisionContext['position'],
  kind: 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE',
  sizing?: DecisionSizing,
): boolean {
  if (kind === 'FOLD') return validateAction(state, { type: 'FOLD', position }) === null
  if (kind === 'CHECK') return validateAction(state, { type: 'CHECK', position }) === null
  if (kind === 'CALL') return validateAction(state, { type: 'CALL', position }) === null
  if (kind === 'BET') {
    if (!sizing) return false
    return validateAction(state, { type: 'BET', position, amountChips: sizing.amountChips }) === null
  }
  if (!sizing?.raiseToChips) return false
  return (
    validateAction(state, {
      type: 'RAISE',
      position,
      raiseToChips: sizing.raiseToChips,
    }) === null
  )
}
