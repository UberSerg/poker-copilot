import type { Card, Rank } from '../../../domain/cards/Card'
import { getRank, getSuit, RANKS } from '../../../domain/cards/Card'
import type { HandCategory } from '../../hand-evaluator/HandEvaluator'
import { createHandEvaluator } from '../../hand-evaluator/nativeEvaluator'

export type PairContext = 'OVERPAIR' | 'TOP_PAIR' | 'SECOND_PAIR' | 'BOTTOM_PAIR'

export type DrawContext =
  | 'NONE'
  | 'FLUSH_DRAW'
  | 'STRAIGHT_DRAW'
  | 'COMBO_DRAW'

export type StrengthClass = 'MONSTER' | 'STRONG' | 'MEDIUM' | 'WEAK'

export interface HandContext {
  madeHandCategory: HandCategory | 'PREFLOP'
  pairContext?: PairContext
  drawContext: DrawContext
  strengthClass: StrengthClass
  description: string[]
}

const evaluator = createHandEvaluator()

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank)
}

/**
 * Poker hand context for decision explanations (not a full outs engine).
 */
export function analyzeHandContext(
  heroCards: readonly [Card, Card],
  board: readonly Card[],
): HandContext {
  if (board.length < 3) {
    return {
      madeHandCategory: 'PREFLOP',
      drawContext: 'NONE',
      strengthClass: 'MEDIUM',
      description: ['Комбинация определяется после флопа'],
    }
  }

  const evaluated = evaluator.evaluate([...heroCards, ...board])
  const flushDraw = hasFlushDraw(heroCards, board)
  const straightDraw = hasStraightDraw(heroCards, board)
  let drawContext: DrawContext = 'NONE'
  if (flushDraw && straightDraw) drawContext = 'COMBO_DRAW'
  else if (flushDraw) drawContext = 'FLUSH_DRAW'
  else if (straightDraw) drawContext = 'STRAIGHT_DRAW'

  const pairContext =
    evaluated.category === 'PAIR' || evaluated.category === 'TWO_PAIR'
      ? classifyPair(heroCards, board, evaluated.category)
      : evaluated.category === 'THREE_OF_A_KIND' ||
          evaluated.category === 'FULL_HOUSE' ||
          evaluated.category === 'FOUR_OF_A_KIND'
        ? undefined
        : evaluated.category === 'HIGH_CARD'
          ? undefined
          : classifyPair(heroCards, board, 'PAIR')

  // Prefer overpair detection for pocket pairs even when category is PAIR
  const overOrTop = classifyPocketOrTop(heroCards, board, evaluated.category)
  const resolvedPair = overOrTop ?? pairContext

  const strengthClass = classifyStrength(evaluated.category, resolvedPair, drawContext)
  const description = buildDescription(evaluated.category, resolvedPair, drawContext)

  return {
    madeHandCategory: evaluated.category,
    pairContext: resolvedPair,
    drawContext,
    strengthClass,
    description,
  }
}

function classifyPocketOrTop(
  hero: readonly [Card, Card],
  board: readonly Card[],
  category: HandCategory,
): PairContext | undefined {
  const h0 = getRank(hero[0])
  const h1 = getRank(hero[1])
  const boardRanks = board.map(getRank)
  const boardMax = Math.max(...boardRanks.map(rankValue))

  if (h0 === h1 && category === 'PAIR') {
    if (rankValue(h0) > boardMax) return 'OVERPAIR'
  }
  if (category === 'PAIR') {
    const pairRank = h0 === h1 ? h0 : boardRanks.includes(h0) ? h0 : boardRanks.includes(h1) ? h1 : null
    if (!pairRank) return undefined
    const uniqueBoard = [...new Set(boardRanks.map(rankValue))].sort((a, b) => b - a)
    if (rankValue(pairRank) === uniqueBoard[0]) return 'TOP_PAIR'
    if (uniqueBoard[1] !== undefined && rankValue(pairRank) === uniqueBoard[1]) return 'SECOND_PAIR'
    return 'BOTTOM_PAIR'
  }
  return undefined
}

function classifyPair(
  hero: readonly [Card, Card],
  board: readonly Card[],
  category: HandCategory,
): PairContext | undefined {
  return classifyPocketOrTop(hero, board, category === 'TWO_PAIR' ? 'PAIR' : category)
}

function hasFlushDraw(hero: readonly [Card, Card], board: readonly Card[]): boolean {
  // Already have flush → not a draw
  const all = [...hero, ...board]
  const suitCounts = new Map<string, number>()
  for (const c of all) {
    const s = getSuit(c)
    suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1)
  }
  if ([...suitCounts.values()].some((n) => n >= 5)) return false

  for (const suit of new Set(hero.map(getSuit))) {
    const heroSuited = hero.filter((c) => getSuit(c) === suit).length
    const boardSuited = board.filter((c) => getSuit(c) === suit).length
    if (heroSuited >= 1 && heroSuited + boardSuited === 4) return true
  }
  return false
}

function hasStraightDraw(hero: readonly [Card, Card], board: readonly Card[]): boolean {
  const evalNow = evaluator.evaluate([...hero, ...board])
  if (
    evalNow.category === 'STRAIGHT' ||
    evalNow.category === 'STRAIGHT_FLUSH'
  ) {
    return false
  }
  // Simple heuristic: among unique ranks of hero+board, exists window of 5 with 4 ranks (OESD/gutshot-ish)
  const values = [...new Set([...hero, ...board].map((c) => rankValue(getRank(c))))].sort(
    (a, b) => a - b,
  )
  // Ace-low
  const expanded = values.includes(12) ? [...new Set([...values, -1])].sort((a, b) => a - b) : values
  for (let high = 3; high <= 12; high += 1) {
    const low = high - 4
    const count = expanded.filter((v) => v >= low && v <= high).length
    if (count >= 4) return true
  }
  return false
}

function classifyStrength(
  category: HandCategory,
  pair: PairContext | undefined,
  draw: DrawContext,
): StrengthClass {
  if (
    category === 'STRAIGHT_FLUSH' ||
    category === 'FOUR_OF_A_KIND' ||
    category === 'FULL_HOUSE'
  ) {
    return 'MONSTER'
  }
  if (category === 'FLUSH' || category === 'STRAIGHT' || category === 'THREE_OF_A_KIND') {
    return 'STRONG'
  }
  if (category === 'TWO_PAIR') return 'STRONG'
  if (category === 'PAIR') {
    if (pair === 'OVERPAIR' || pair === 'TOP_PAIR') return 'STRONG'
    if (pair === 'SECOND_PAIR') return 'MEDIUM'
    return 'WEAK'
  }
  if (draw === 'COMBO_DRAW') return 'MEDIUM'
  if (draw === 'FLUSH_DRAW' || draw === 'STRAIGHT_DRAW') return 'MEDIUM'
  return 'WEAK'
}

function buildDescription(
  category: HandCategory,
  pair: PairContext | undefined,
  draw: DrawContext,
): string[] {
  const items: string[] = []
  if (pair === 'TOP_PAIR') items.push('Топ-пара')
  else if (pair === 'OVERPAIR') items.push('Оверпара')
  else if (pair === 'SECOND_PAIR') items.push('Вторая пара')
  else if (pair === 'BOTTOM_PAIR') items.push('Нижняя пара')
  else {
    const labels: Record<HandCategory, string> = {
      HIGH_CARD: 'Старшая карта',
      PAIR: 'Пара',
      TWO_PAIR: 'Две пары',
      THREE_OF_A_KIND: 'Сет / трипс',
      STRAIGHT: 'Стрит',
      FLUSH: 'Флеш',
      FULL_HOUSE: 'Фулл-хаус',
      FOUR_OF_A_KIND: 'Каре',
      STRAIGHT_FLUSH: 'Стрит-флеш',
    }
    items.push(labels[category])
  }
  if (draw === 'FLUSH_DRAW') items.push('Флеш-дро')
  if (draw === 'STRAIGHT_DRAW') items.push('Стрит-дро')
  if (draw === 'COMBO_DRAW') items.push('Комбо-дро')
  return items
}
