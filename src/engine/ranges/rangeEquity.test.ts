import { describe, expect, it } from 'vitest'
import { calculateExact, calculateMonteCarlo } from '../equity'
import { applyBlockers } from './blockers'
import { parseRange } from './parser'
import { PokerRange } from './Range'
import type { WeightedCombo } from './RangeCombo'

describe('equity vs weighted range', () => {
  it('one-combo range matches exact opponent on river', () => {
    const hero = ['As', 'Ah'] as const
    const opp = ['Ks', 'Kh'] as const
    const board = ['2c', '7d', '9h', '3s', '8c'] as const

    const exact = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'EXACT',
      opponentCards: opp,
    })
    const range = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'RANGE',
      rangeCombos: [{ cards: opp, weight: 1 }],
    })
    expect(exact.ok && range.ok).toBe(true)
    if (!exact.ok || !range.ok) return
    expect(range.result.equity).toBeCloseTo(exact.result.equity, 10)
    expect(range.result.winProbability).toBeCloseTo(exact.result.winProbability, 10)
  })

  it('equal weights average two river outcomes', () => {
    const hero = ['As', 'Ah'] as const
    const board = ['2c', '7d', '9h', '3s', '8c'] as const
    const strong: WeightedCombo = { cards: ['Ks', 'Kh'], weight: 1 }
    const weak: WeightedCombo = { cards: ['2d', '3d'], weight: 1 }

    const vsStrong = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'EXACT',
      opponentCards: strong.cards,
    })
    const vsWeak = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'EXACT',
      opponentCards: weak.cards,
    })
    const vsRange = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'RANGE',
      rangeCombos: [strong, weak],
    })
    expect(vsStrong.ok && vsWeak.ok && vsRange.ok).toBe(true)
    if (!vsStrong.ok || !vsWeak.ok || !vsRange.ok) return
    const expected =
      (vsStrong.result.equity + vsWeak.result.equity) / 2
    expect(vsRange.result.equity).toBeCloseTo(expected, 10)
  })

  it('unequal weights 1 vs 0.5', () => {
    const hero = ['As', 'Ah'] as const
    const board = ['2c', '7d', '9h', '3s', '8c'] as const
    const a: WeightedCombo = { cards: ['Ks', 'Kh'], weight: 1 }
    const b: WeightedCombo = { cards: ['2d', '3d'], weight: 0.5 }

    const vsA = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'EXACT',
      opponentCards: a.cards,
    })
    const vsB = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'EXACT',
      opponentCards: b.cards,
    })
    const vsRange = calculateExact({
      heroCards: hero,
      board: [...board],
      opponentMode: 'RANGE',
      rangeCombos: [a, b],
    })
    expect(vsA.ok && vsB.ok && vsRange.ok).toBe(true)
    if (!vsA.ok || !vsB.ok || !vsRange.ok) return
    const expected = (1 * vsA.result.equity + 0.5 * vsB.result.equity) / 1.5
    expect(vsRange.result.equity).toBeCloseTo(expected, 10)
  })

  it('never simulates blocked combos', () => {
    const parsed = parseRange('AA')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const hero = ['As', 'Kh'] as const
    const available = applyBlockers(parsed.range, [...hero])
    expect(available.size).toBe(3)
    const result = calculateExact({
      heroCards: hero,
      board: ['2c', '7d', '9h', '3s', '8c'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.winProbability + result.result.tieProbability + result.result.lossProbability).toBeCloseTo(
      1,
      10,
    )
  })

  it('seeded MC vs range is deterministic', () => {
    const parsed = parseRange('TT+, AQs+, AKo')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const hero = ['As', 'Qd'] as const
    const available = applyBlockers(parsed.range, [...hero])
    const input = {
      heroCards: hero,
      board: [] as const,
      opponentMode: 'RANGE' as const,
      rangeCombos: available.toCombos(),
      iterations: 5_000,
      seed: 99,
    }
    const a = calculateMonteCarlo(input, { iterations: 5_000, seed: 99 })
    const b = calculateMonteCarlo(input, { iterations: 5_000, seed: 99 })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.result.wins).toBe(b.result.wins)
    expect(a.result.ties).toBe(b.result.ties)
    expect(a.result.losses).toBe(b.result.losses)
  })

  it('empty range after blockers errors', () => {
    const range = PokerRange.fromCombos([{ cards: ['As', 'Ah'], weight: 1 }])
    const blocked = applyBlockers(range, ['As', 'Kd'])
    expect(blocked.size).toBe(0)
    const result = calculateExact({
      heroCards: ['As', 'Kd'],
      board: [],
      opponentMode: 'RANGE',
      rangeCombos: blocked.toCombos(),
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('RANGE_EMPTY_AFTER_BLOCKERS')
  })

  it('probability invariant for range exact', () => {
    const parsed = parseRange('KK, QQ')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const hero = ['As', 'Ah'] as const
    const available = applyBlockers(parsed.range, [...hero])
    const result = calculateExact({
      heroCards: hero,
      board: ['2c', '7d', '9h'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const sum =
      result.result.winProbability +
      result.result.tieProbability +
      result.result.lossProbability
    expect(sum).toBeCloseTo(1, 8)
    expect(result.result.equity).toBeCloseTo(
      result.result.winProbability + result.result.tieProbability / 2,
      10,
    )
  })
})
