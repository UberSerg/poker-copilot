import type { Rank } from '../../domain/cards/Card'
import { RANKS } from '../../domain/cards/Card'
import {
  createHandClass,
  formatHandClass,
  type HandClass,
} from './HandClass'

/** All 169 NLHE starting hand classes (13 pairs + 78 suited + 78 offsuit). */
export function allHandClasses(): readonly HandClass[] {
  const result: HandClass[] = []
  for (let i = RANKS.length - 1; i >= 0; i -= 1) {
    const high = RANKS[i]!
    result.push(createHandClass(high, high, 'PAIR'))
    for (let j = i - 1; j >= 0; j -= 1) {
      const low = RANKS[j]!
      result.push(createHandClass(high, low, 'SUITED'))
      result.push(createHandClass(high, low, 'OFFSUIT'))
    }
  }
  return result
}

export const ALL_HAND_CLASSES: readonly HandClass[] = allHandClasses()

export function handClassByKey(key: string): HandClass | undefined {
  return ALL_HAND_CLASSES.find((hand) => formatHandClass(hand) === key)
}

/** Pair ladder from lowRank up to AA inclusive. */
export function pairPlus(from: Rank): HandClass[] {
  const start = RANKS.indexOf(from)
  const out: HandClass[] = []
  for (let i = start; i < RANKS.length; i += 1) {
    const r = RANKS[i]!
    out.push(createHandClass(r, r, 'PAIR'))
  }
  return out
}

export function pairInterval(from: Rank, to: Rank): HandClass[] | null {
  const a = RANKS.indexOf(from)
  const b = RANKS.indexOf(to)
  if (a < 0 || b < 0 || a > b) return null
  const out: HandClass[] = []
  for (let i = a; i <= b; i += 1) {
    const r = RANKS[i]!
    out.push(createHandClass(r, r, 'PAIR'))
  }
  return out
}

/**
 * Non-pair plus: fix high card, raise the kicker toward the high card.
 * AJs+ => AJs,AQs,AKs
 */
export function nonPairPlus(hand: HandClass): HandClass[] | null {
  if (hand.suitedness === 'PAIR') return null
  const highIdx = RANKS.indexOf(hand.highRank)
  const lowIdx = RANKS.indexOf(hand.lowRank)
  if (lowIdx < 0 || highIdx < 0 || lowIdx >= highIdx) return null
  const out: HandClass[] = []
  for (let i = lowIdx; i < highIdx; i += 1) {
    out.push(createHandClass(hand.highRank, RANKS[i]!, hand.suitedness))
  }
  return out
}

/**
 * Non-pair interval with same high rank and suitedness: ATs-AQs => ATs,AJs,AQs
 */
export function nonPairInterval(from: HandClass, to: HandClass): HandClass[] | null {
  if (from.suitedness === 'PAIR' || to.suitedness === 'PAIR') return null
  if (from.highRank !== to.highRank) return null
  if (from.suitedness !== to.suitedness) return null
  const a = RANKS.indexOf(from.lowRank)
  const b = RANKS.indexOf(to.lowRank)
  if (a < 0 || b < 0 || a > b) return null
  const highIdx = RANKS.indexOf(from.highRank)
  const out: HandClass[] = []
  for (let i = a; i <= b; i += 1) {
    if (i >= highIdx) return null
    out.push(createHandClass(from.highRank, RANKS[i]!, from.suitedness))
  }
  return out
}
