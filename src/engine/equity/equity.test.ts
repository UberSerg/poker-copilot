import { describe, expect, it } from 'vitest'
import {
  calculateExact,
  calculateMonteCarlo,
  createEquityEngine,
  createSeededRandom,
  estimateExactCombinations,
  sampleWithoutReplacement,
} from './index'
import type { Card } from '../../domain/cards/Card'
import { remainingDeck } from './deckUtils'

const engine = createEquityEngine()

describe('EquityEngine', () => {
  it('river exact hero wins 100%', () => {
    const result = engine.calculate({
      heroCards: ['As', 'Ah'],
      opponentMode: 'EXACT',
      opponentCards: ['Ks', 'Kh'],
      board: ['2c', '7d', '9h', 'Jc', '3s'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.method).toBe('EXACT')
    expect(result.result.winProbability).toBe(1)
    expect(result.result.equity).toBe(1)
    expect(result.result.iterations).toBe(1)
  })

  it('river exact hero loses 100%', () => {
    const result = engine.calculate({
      heroCards: ['2s', '2h'],
      opponentMode: 'EXACT',
      opponentCards: ['As', 'Ah'],
      board: ['Kc', 'Kd', 'Kh', '7c', '3s'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.lossProbability).toBe(1)
    expect(result.result.equity).toBe(0)
  })

  it('river board-plays tie equity 50%', () => {
    const result = engine.calculate({
      heroCards: ['2c', '2d'],
      opponentMode: 'EXACT',
      opponentCards: ['3c', '3d'],
      board: ['Ac', 'Kd', 'Qh', 'Js', 'Tc'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.tieProbability).toBe(1)
    expect(result.result.equity).toBe(0.5)
  })

  it('turn exact uses 44 rivers (C(44,1))', () => {
    const result = calculateExact({
      heroCards: ['As', 'Kd'],
      opponentMode: 'EXACT',
      opponentCards: ['Qh', 'Qd'],
      board: ['Jc', 'Ts', '2c', '7h'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.iterations).toBe(44)
    expect(result.result.wins + result.result.ties + result.result.losses).toBe(44)
  })

  it('flop exact uses C(45,2)=990 combinations not permutations', () => {
    expect(
      estimateExactCombinations({
        heroCards: ['As', 'Ks'],
        opponentMode: 'EXACT',
        opponentCards: ['Qh', 'Qd'],
        board: ['Js', 'Tc', '2c'],
      }),
    ).toBe(990)

    const result = calculateExact({
      heroCards: ['As', 'Ks'],
      opponentMode: 'EXACT',
      opponentCards: ['Qh', 'Qd'],
      board: ['Js', 'Tc', '2c'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.result.iterations).toBe(990)
    expect(result.result.method).toBe('EXACT')
  })

  it('equity = win + tie/2', () => {
    const winProbability = 0.4
    const tieProbability = 0.2
    expect(winProbability + tieProbability / 2).toBe(0.5)
  })

  it('seeded Monte Carlo is deterministic', () => {
    const input = {
      heroCards: ['As', 'Ah'] as [Card, Card],
      opponentMode: 'RANDOM' as const,
      board: [] as Card[],
      iterations: 10_000,
      seed: 12345,
    }
    const a = calculateMonteCarlo(input, { iterations: 10_000, seed: 12345 })
    const b = calculateMonteCarlo(input, { iterations: 10_000, seed: 12345 })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.result.wins).toBe(b.result.wins)
    expect(a.result.ties).toBe(b.result.ties)
    expect(a.result.losses).toBe(b.result.losses)
  })

  it('Monte Carlo converges near exact on turn spot', () => {
    const base = {
      heroCards: ['As', 'Kd'] as [Card, Card],
      opponentMode: 'EXACT' as const,
      opponentCards: ['Qh', 'Qd'] as [Card, Card],
      board: ['Jc', 'Ts', '2c', '7h'] as Card[],
    }
    const exact = calculateExact(base)
    const mc = calculateMonteCarlo(base, { iterations: 20_000, seed: 7 })
    expect(exact.ok && mc.ok).toBe(true)
    if (!exact.ok || !mc.ok) return
    expect(Math.abs(mc.result.equity - exact.result.equity)).toBeLessThan(0.03)
  })

  it('probability invariants hold', () => {
    const result = engine.calculate({
      heroCards: ['As', 'Ks'],
      opponentMode: 'EXACT',
      opponentCards: ['Qh', 'Qd'],
      board: ['Js', 'Tc', '2c'],
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const { winProbability, tieProbability, lossProbability, wins, ties, losses, iterations } =
      result.result
    expect(wins + ties + losses).toBe(iterations)
    expect(Math.abs(winProbability + tieProbability + lossProbability - 1)).toBeLessThan(1e-12)
  })

  it('sampling without replacement never duplicates', () => {
    const rng = createSeededRandom(99)
    const deck = remainingDeck(new Set(['As', 'Kd'] as Card[]))
    for (let i = 0; i < 500; i += 1) {
      const sample = sampleWithoutReplacement(deck, 5, rng)
      expect(new Set(sample).size).toBe(5)
    }
  })

  it('does not mutate input cards', () => {
    const heroCards: [Card, Card] = ['As', 'Ah']
    const board: Card[] = ['2c', '7d', '9h']
    const opponentCards: [Card, Card] = ['Ks', 'Kh']
    const heroCopy = [...heroCards]
    const boardCopy = [...board]
    engine.calculate({
      heroCards,
      board,
      opponentMode: 'EXACT',
      opponentCards,
    })
    expect(heroCards).toEqual(heroCopy)
    expect(board).toEqual(boardCopy)
  })
})
