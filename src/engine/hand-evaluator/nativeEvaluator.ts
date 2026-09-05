import { getRank, getSuit, type Card, type Rank } from '../../domain/cards/Card'
import { RANKS } from '../../domain/cards/Card'
import {
  HAND_CATEGORY_RANK,
  type EvaluatedHand,
  type HandCategory,
  type HandEvaluator,
} from './HandEvaluator'

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const result: T[][] = []
  const n = items.length
  if (k > n || k <= 0) {
    return result
  }
  const indices = Array.from({ length: k }, (_, i) => i)
  while (true) {
    result.push(indices.map((i) => items[i]!))
    let i = k - 1
    while (i >= 0 && indices[i] === n - k + i) {
      i -= 1
    }
    if (i < 0) {
      break
    }
    indices[i]! += 1
    for (let j = i + 1; j < k; j += 1) {
      indices[j] = indices[j - 1]! + 1
    }
  }
  return result
}

function encodeRankValue(category: HandCategory, tiebreakers: readonly number[]): number {
  let value = HAND_CATEGORY_RANK[category] * 1_000_000_000
  let place = 1_000_000
  for (const tb of tiebreakers) {
    value += tb * place
    place = Math.floor(place / 20)
  }
  return value
}

function findStraightHigh(sortedUniqueDesc: number[]): number | null {
  if (sortedUniqueDesc.length < 5) {
    return null
  }
  for (let i = 0; i <= sortedUniqueDesc.length - 5; i += 1) {
    const window = sortedUniqueDesc.slice(i, i + 5)
    if (window[0]! - window[4]! === 4) {
      return window[0]!
    }
  }
  // Wheel: A-5
  const set = new Set(sortedUniqueDesc)
  if ([14, 5, 4, 3, 2].every((r) => set.has(r))) {
    return 5
  }
  return null
}

function evaluateFive(cards: readonly Card[]): EvaluatedHand {
  if (cards.length !== 5) {
    throw new Error('evaluateFive expects exactly 5 cards')
  }

  const byRank = new Map<number, Card[]>()
  for (const card of cards) {
    const value = RANK_VALUE[getRank(card)]
    const list = byRank.get(value) ?? []
    list.push(card)
    byRank.set(value, list)
  }

  const ranksDesc = [...byRank.keys()].sort((a, b) => b - a)
  const counts = ranksDesc.map((rank) => ({
    rank,
    count: byRank.get(rank)!.length,
    cards: byRank.get(rank)!,
  }))
  counts.sort((a, b) => b.count - a.count || b.rank - a.rank)

  const isFlush = cards.every((card) => getSuit(card) === getSuit(cards[0]!))
  const uniqueSorted = [...new Set(cards.map((card) => RANK_VALUE[getRank(card)]))].sort(
    (a, b) => b - a,
  )
  const straightHigh = findStraightHigh(uniqueSorted)
  const isStraight = straightHigh !== null

  let category: HandCategory
  let tiebreakers: number[]
  let bestFive = [...cards]

  if (isStraight && isFlush) {
    category = 'STRAIGHT_FLUSH'
    tiebreakers = [straightHigh!]
    bestFive = orderStraightFive(cards, straightHigh!)
  } else if (counts[0]!.count === 4) {
    category = 'FOUR_OF_A_KIND'
    const quad = counts[0]!.rank
    const kicker = counts[1]!.rank
    tiebreakers = [quad, kicker]
    bestFive = [...counts[0]!.cards, counts[1]!.cards[0]!]
  } else if (counts[0]!.count === 3 && counts[1]!.count >= 2) {
    category = 'FULL_HOUSE'
    tiebreakers = [counts[0]!.rank, counts[1]!.rank]
    bestFive = [...counts[0]!.cards, ...counts[1]!.cards.slice(0, 2)]
  } else if (isFlush) {
    category = 'FLUSH'
    tiebreakers = [...cards]
      .map((card) => RANK_VALUE[getRank(card)])
      .sort((a, b) => b - a)
    bestFive = [...cards].sort(
      (a, b) => RANK_VALUE[getRank(b)] - RANK_VALUE[getRank(a)],
    )
  } else if (isStraight) {
    category = 'STRAIGHT'
    tiebreakers = [straightHigh!]
    bestFive = orderStraightFive(cards, straightHigh!)
  } else if (counts[0]!.count === 3) {
    category = 'THREE_OF_A_KIND'
    const kickers = counts.slice(1).map((c) => c.rank)
    tiebreakers = [counts[0]!.rank, ...kickers]
    bestFive = [
      ...counts[0]!.cards,
      ...counts
        .slice(1)
        .flatMap((c) => c.cards)
        .sort((a, b) => RANK_VALUE[getRank(b)] - RANK_VALUE[getRank(a)])
        .slice(0, 2),
    ]
  } else if (counts[0]!.count === 2 && counts[1]!.count === 2) {
    category = 'TWO_PAIR'
    const highPair = Math.max(counts[0]!.rank, counts[1]!.rank)
    const lowPair = Math.min(counts[0]!.rank, counts[1]!.rank)
    const kicker = counts[2]!.rank
    tiebreakers = [highPair, lowPair, kicker]
    const highCards = counts.find((c) => c.rank === highPair)!.cards
    const lowCards = counts.find((c) => c.rank === lowPair)!.cards
    bestFive = [...highCards, ...lowCards, counts[2]!.cards[0]!]
  } else if (counts[0]!.count === 2) {
    category = 'PAIR'
    const kickers = counts.slice(1).map((c) => c.rank)
    tiebreakers = [counts[0]!.rank, ...kickers]
    bestFive = [
      ...counts[0]!.cards,
      ...counts
        .slice(1)
        .flatMap((c) => c.cards)
        .sort((a, b) => RANK_VALUE[getRank(b)] - RANK_VALUE[getRank(a)])
        .slice(0, 3),
    ]
  } else {
    category = 'HIGH_CARD'
    tiebreakers = ranksDesc
    bestFive = [...cards].sort(
      (a, b) => RANK_VALUE[getRank(b)] - RANK_VALUE[getRank(a)],
    )
  }

  return {
    category,
    bestFive,
    rankValue: encodeRankValue(category, tiebreakers),
    tiebreakers,
  }
}

function orderStraightFive(cards: readonly Card[], high: number): Card[] {
  const byRank = new Map<number, Card>()
  for (const card of cards) {
    byRank.set(RANK_VALUE[getRank(card)], card)
  }
  if (high === 5) {
    return [14, 5, 4, 3, 2].map((rank) => byRank.get(rank)!)
  }
  return [high, high - 1, high - 2, high - 3, high - 4].map((rank) => byRank.get(rank)!)
}

function compareEvaluated(a: EvaluatedHand, b: EvaluatedHand): number {
  if (a.rankValue !== b.rankValue) {
    return a.rankValue > b.rankValue ? 1 : -1
  }
  const len = Math.max(a.tiebreakers.length, b.tiebreakers.length)
  for (let i = 0; i < len; i += 1) {
    const av = a.tiebreakers[i] ?? 0
    const bv = b.tiebreakers[i] ?? 0
    if (av !== bv) {
      return av > bv ? 1 : -1
    }
  }
  return 0
}

export class NativeHandEvaluator implements HandEvaluator {
  evaluate(cards: readonly Card[]): EvaluatedHand {
    if (cards.length < 5 || cards.length > 7) {
      throw new Error(`HandEvaluator expects 5–7 cards, got ${cards.length}`)
    }
    if (cards.length === 5) {
      return evaluateFive(cards)
    }

    let best: EvaluatedHand | null = null
    for (const five of combinations(cards, 5)) {
      const evaluated = evaluateFive(five)
      if (!best || compareEvaluated(evaluated, best) > 0) {
        best = evaluated
      }
    }
    return best!
  }

  compare(a: EvaluatedHand, b: EvaluatedHand): number {
    return compareEvaluated(a, b)
  }
}

export function createHandEvaluator(): HandEvaluator {
  return new NativeHandEvaluator()
}

/** Exposed for equity loops — generate C(n,k) without allocating intermediate labels. */
export function cardCombinations(cards: readonly Card[], k: number): Card[][] {
  return combinations(cards, k)
}

export function rankValueOf(rank: Rank): number {
  return RANK_VALUE[rank]
}

export function allRankLabels(): readonly Rank[] {
  return RANKS
}
