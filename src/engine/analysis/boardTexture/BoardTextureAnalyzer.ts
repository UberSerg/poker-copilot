import type { Card, Rank } from '../../../domain/cards/Card'
import { getRank, getSuit, RANKS } from '../../../domain/cards/Card'

export type Connectedness = 'LOW' | 'MEDIUM' | 'HIGH'
export type TextureClass = 'DRY' | 'SEMI_WET' | 'WET'

export interface BoardTexture {
  paired: boolean
  monotone: boolean
  flushPossible: boolean
  straightPossible: boolean
  connectedness: Connectedness
  texture: TextureClass
  description: string[]
}

function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank)
}

/**
 * Classify board texture (descriptive only — not GTO range advantage).
 * Works for 0–5 board cards; meaningful from flop (3+).
 */
export function analyzeBoardTexture(board: readonly Card[]): BoardTexture {
  if (board.length === 0) {
    return {
      paired: false,
      monotone: false,
      flushPossible: false,
      straightPossible: false,
      connectedness: 'LOW',
      texture: 'DRY',
      description: ['Preflop: текстура борда ещё не определена'],
    }
  }

  const ranks = board.map((c) => getRank(c))
  const suits = board.map((c) => getSuit(c))
  const values = ranks.map(rankValue).sort((a, b) => a - b)

  const rankCounts = new Map<Rank, number>()
  for (const r of ranks) {
    rankCounts.set(r, (rankCounts.get(r) ?? 0) + 1)
  }
  const paired = [...rankCounts.values()].some((n) => n >= 2)

  const suitCounts = new Map<string, number>()
  for (const s of suits) {
    suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1)
  }
  const maxSuit = Math.max(...suitCounts.values())
  const flushPossible = maxSuit >= 2 && board.length >= 3
  const monotone = board.length >= 3 && maxSuit === board.length

  const uniqueValues = [...new Set(values)].sort((a, b) => a - b)
  const straightPossible = detectStraightPossible(uniqueValues)
  const connectedness = measureConnectedness(uniqueValues)

  let wetScore = 0
  if (flushPossible) wetScore += 2
  if (monotone) wetScore += 1
  if (straightPossible) wetScore += 2
  if (connectedness === 'HIGH') wetScore += 2
  else if (connectedness === 'MEDIUM') wetScore += 1
  if (paired) wetScore -= 1

  let texture: TextureClass = 'DRY'
  if (wetScore >= 4) texture = 'WET'
  else if (wetScore >= 2) texture = 'SEMI_WET'

  const description: string[] = []
  if (paired) description.push('Парный борд')
  if (monotone) description.push('Монотонный борд')
  else if (flushPossible) description.push('Возможен флеш')
  if (straightPossible) description.push('Возможен стрит')
  description.push(
    texture === 'DRY'
      ? 'Сухой борд'
      : texture === 'WET'
        ? 'Мокрый борд'
        : 'Полумокрый борд',
  )
  description.push(
    connectedness === 'HIGH'
      ? 'Высокая связность'
      : connectedness === 'MEDIUM'
        ? 'Средняя связность'
        : 'Низкая связность',
  )

  return {
    paired,
    monotone,
    flushPossible,
    straightPossible,
    connectedness,
    texture,
    description,
  }
}

function detectStraightPossible(uniqueSorted: number[]): boolean {
  if (uniqueSorted.length < 2) return false
  // Include ace-low wheel potential
  const withWheel =
    uniqueSorted.includes(12) /* A */
      ? [...uniqueSorted, -1] // treat A as 1 below 2 for gaps
      : uniqueSorted

  // Check if any 5-window of ranks has >= 3 board ranks (flop+) or close gaps
  for (let high = 4; high <= 12; high += 1) {
    const low = high - 4
    let count = 0
    for (const v of uniqueSorted) {
      if (v >= low && v <= high) count += 1
    }
    // Ace as low for wheel A2345
    if (low <= 0 && uniqueSorted.includes(12)) {
      const wheelRanks = [12, 0, 1, 2, 3]
      count = uniqueSorted.filter((v) => wheelRanks.includes(v)).length
    }
    if (count >= 3) return true
  }
  // Connected pairs of gaps <= 2 among unique
  let closePairs = 0
  for (let i = 1; i < uniqueSorted.length; i += 1) {
    if (uniqueSorted[i]! - uniqueSorted[i - 1]! <= 2) closePairs += 1
  }
  void withWheel
  return closePairs >= 2 && uniqueSorted.length >= 3
}

function measureConnectedness(uniqueSorted: number[]): Connectedness {
  if (uniqueSorted.length < 2) return 'LOW'
  let gaps = 0
  let tight = 0
  for (let i = 1; i < uniqueSorted.length; i += 1) {
    const gap = uniqueSorted[i]! - uniqueSorted[i - 1]!
    gaps += gap
    if (gap <= 2) tight += 1
  }
  const avgGap = gaps / (uniqueSorted.length - 1)
  if (tight >= 2 || avgGap <= 1.5) return 'HIGH'
  if (tight >= 1 || avgGap <= 3) return 'MEDIUM'
  return 'LOW'
}
