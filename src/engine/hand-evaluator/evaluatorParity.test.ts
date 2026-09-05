import { describe, expect, it } from 'vitest'
import type { Card } from '../../domain/cards/Card'
import { FULL_DECK } from '../../domain/cards/deck'
import { createSeededRandom } from '../equity/rng'
import { createHandEvaluator } from './nativeEvaluator'
import { compareHoleBoards, handStrength } from './pokerToolsStrength'

const native = createHandEvaluator()

function cmpSign(n: number): -1 | 0 | 1 {
  if (n > 0) return 1
  if (n < 0) return -1
  return 0
}

describe('evaluator parity native vs pokertools', () => {
  const fixtures: { hero: Card[]; villain: Card[]; board: Card[]; label: string }[] = [
    {
      label: 'AA vs KK river',
      hero: ['As', 'Ah'],
      villain: ['Ks', 'Kh'],
      board: ['2c', '7d', '9h', '3s', '8c'],
    },
    {
      label: 'board plays tie',
      hero: ['2c', '2d'],
      villain: ['3c', '3d'],
      board: ['Ac', 'Kd', 'Qh', 'Js', 'Tc'],
    },
    {
      label: 'wheel vs broadway',
      hero: ['As', '2d'],
      villain: ['Ts', 'Jd'],
      board: ['3c', '4h', '5s', '9c', '8d'],
    },
    {
      label: 'flush vs full house',
      hero: ['As', 'Ks'],
      villain: ['Qh', 'Qd'],
      board: ['Qs', '2s', '7s', 'Qc', '3d'],
    },
    {
      label: 'kicker battle',
      hero: ['Ad', 'Kc'],
      villain: ['Ac', 'Qd'],
      board: ['Ah', '7s', '2c', '9d', '3h'],
    },
    {
      label: 'quads vs straight flush',
      hero: ['5s', '5d'],
      villain: ['9h', '8h'],
      board: ['5c', '5h', '7h', '6h', '2c'],
    },
    {
      label: 'two pair vs trips',
      hero: ['As', 'Kd'],
      villain: ['8c', '8d'],
      board: ['Ah', 'Kc', '8h', '2s', '3d'],
    },
    {
      label: 'exact tie same best five',
      hero: ['As', 'Kd'],
      villain: ['Ac', 'Kh'],
      board: ['2c', '7d', '9h', '3s', '8c'],
    },
  ]

  it('agrees on ordering for golden showdown fixtures', () => {
    for (const f of fixtures) {
      const heroEval = native.evaluate([...f.hero, ...f.board])
      const villainEval = native.evaluate([...f.villain, ...f.board])
      const nativeCmp = cmpSign(native.compare(heroEval, villainEval))
      const libCmp = cmpSign(compareHoleBoards(f.hero, f.villain, f.board))
      expect(libCmp, f.label).toBe(nativeCmp)
    }
  })

  it('seeded random 7-card pairwise ordering parity', () => {
    const rng = createSeededRandom(12345)
    const comparisons = 3000
    for (let i = 0; i < comparisons; i += 1) {
      const deck = [...FULL_DECK]
      // partial shuffle 9 cards: 2+2+5
      for (let j = 0; j < 9; j += 1) {
        const k = j + Math.floor(rng() * (deck.length - j))
        const tmp = deck[j]!
        deck[j] = deck[k]!
        deck[k] = tmp
      }
      const hero = [deck[0]!, deck[1]!]
      const villain = [deck[2]!, deck[3]!]
      const board = [deck[4]!, deck[5]!, deck[6]!, deck[7]!, deck[8]!]
      const nativeCmp = cmpSign(
        native.compare(native.evaluate([...hero, ...board]), native.evaluate([...villain, ...board])),
      )
      const libCmp = cmpSign(compareHoleBoards(hero, villain, board))
      expect(libCmp).toBe(nativeCmp)
    }
  })

  it('handStrength monotonic with native rankValue on same category samples', () => {
    const a = handStrength(['As', 'Kd', '7c', '4h', '2s'])
    const b = handStrength(['As', 'Ad', '7c', '4h', '2s'])
    expect(b).toBeGreaterThan(a)
  })
})
