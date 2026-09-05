import type { Rank } from '../../domain/cards/Card'
import { RANKS } from '../../domain/cards/Card'

export type Suitedness = 'PAIR' | 'SUITED' | 'OFFSUIT'

/** High→low matrix order: A … 2 */
export const MATRIX_RANKS: readonly Rank[] = [...RANKS].reverse()

export interface HandClass {
  highRank: Rank
  lowRank: Rank
  suitedness: Suitedness
}

export function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank)
}

/** Higher poker rank first (A > K > … > 2). Positive if a > b. */
export function compareRanksDesc(a: Rank, b: Rank): number {
  return rankIndex(a) - rankIndex(b)
}

export function createHandClass(
  highRank: Rank,
  lowRank: Rank,
  suitedness: Suitedness,
): HandClass {
  if (suitedness === 'PAIR') {
    if (highRank !== lowRank) {
      throw new Error('PAIR requires equal ranks')
    }
  } else if (compareRanksDesc(highRank, lowRank) < 0) {
    throw new Error('HandClass ranks must be high → low')
  } else if (highRank === lowRank) {
    throw new Error('Non-pair cannot have equal ranks')
  }
  return { highRank, lowRank, suitedness }
}

export function formatHandClass(hand: HandClass): string {
  if (hand.suitedness === 'PAIR') {
    return `${hand.highRank}${hand.lowRank}`
  }
  const suffix = hand.suitedness === 'SUITED' ? 's' : 'o'
  return `${hand.highRank}${hand.lowRank}${suffix}`
}

export function handClassKey(hand: HandClass): string {
  return formatHandClass(hand)
}

export function parseHandClassToken(raw: string): HandClass | null {
  const token = raw.trim()
  if (token.length === 2) {
    const a = token[0]
    const b = token[1]
    if (!isRankChar(a) || !isRankChar(b) || a !== b) return null
    return createHandClass(a, b, 'PAIR')
  }
  if (token.length === 3) {
    const a = token[0]
    const b = token[1]
    const s = token[2]
    if (!isRankChar(a) || !isRankChar(b)) return null
    if (a === b) return null
    if (s !== 's' && s !== 'o') return null
    if (compareRanksDesc(a, b) < 0) return null
    return createHandClass(a, b, s === 's' ? 'SUITED' : 'OFFSUIT')
  }
  return null
}

function isRankChar(value: string | undefined): value is Rank {
  return value !== undefined && (RANKS as readonly string[]).includes(value)
}
