import { collectUsedCards } from '../cards/cardUtils'
import type { Card } from '../cards/Card'
import { chipsToBb, formatBb } from '../math/chips'
import { getAmountToCall, getEffectiveStackChips, getPot } from '../math/pot'
import { formatPotOddsPercent, getPotOdds } from '../math/potOdds'
import { formatSpr, getSpr } from '../math/spr'
import type { PokerState } from './PokerState'
import type { Position } from './Position'
import { isBettingRoundComplete } from './transitions'

export interface HandMetrics {
  potChips: number
  potBb: number
  amountToCallChips: number
  amountToCallBb: number
  potOdds: number | null
  potOddsLabel: string
  requiredEquityLabel: string
  effectiveStackChips: number | null
  effectiveStackBb: number | null
  spr: number | null
  sprLabel: string
  canAdvanceStreet: boolean
}

export function getUsedCards(state: PokerState): Set<Card> {
  return collectUsedCards([...state.heroCards, ...state.opponentCards, ...state.board])
}

export function getHandMetrics(state: PokerState, forPosition: Position = state.heroPosition): HandMetrics {
  const potChips = getPot(state)
  const amountToCallChips = getAmountToCall(state, forPosition)
  const potOdds = getPotOdds(potChips, amountToCallChips)
  const effectiveStackChips = getEffectiveStackChips(state, forPosition)
  const spr = getSpr(effectiveStackChips, potChips)

  return {
    potChips,
    potBb: chipsToBb(potChips, state.bigBlind),
    amountToCallChips,
    amountToCallBb: chipsToBb(amountToCallChips, state.bigBlind),
    potOdds,
    potOddsLabel: formatPotOddsPercent(potOdds),
    requiredEquityLabel:
      potOdds === null ? '—' : `Необходимое equity: ${formatPotOddsPercent(potOdds)}`,
    effectiveStackChips,
    effectiveStackBb:
      effectiveStackChips === null ? null : chipsToBb(effectiveStackChips, state.bigBlind),
    spr,
    sprLabel: formatSpr(spr),
    canAdvanceStreet: isBettingRoundComplete(state) && !state.handComplete,
  }
}

export function formatChipsAsBb(chips: number, bigBlind: number): string {
  return `${formatBb(chips, bigBlind)} BB`
}
