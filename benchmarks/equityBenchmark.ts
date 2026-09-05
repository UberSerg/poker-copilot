/**
 * Equity / evaluator micro-benchmarks.
 * Run: npm run benchmark
 */
import { performance } from 'node:perf_hooks'
import { createEquityEngine, MC_PRESETS } from '../src/engine/equity'
import { getDefaultHandEvaluator } from '../src/engine/hand-evaluator/adapter'
import type { Card } from '../src/domain/cards/Card'

const engine = createEquityEngine()
const evaluator = getDefaultHandEvaluator()

function bench(label: string, fn: () => void): number {
  const start = performance.now()
  fn()
  const ms = performance.now() - start
  console.log(`${label}: ${ms.toFixed(1)} ms`)
  return ms
}

function main(): void {
  console.log('Poker Copilot equity benchmarks')
  console.log('---')

  bench('A) River exact showdown', () => {
    engine.calculate({
      heroCards: ['As', 'Ah'],
      opponentMode: 'EXACT',
      opponentCards: ['Ks', 'Kh'],
      board: ['2c', '7d', '9h', 'Jc', '3s'],
    })
  })

  bench('B) Turn exact vs exact (44 rivers)', () => {
    engine.calculate({
      heroCards: ['As', 'Kd'],
      opponentMode: 'EXACT',
      opponentCards: ['Qh', 'Qd'],
      board: ['Jc', 'Ts', '2c', '7h'],
    })
  })

  bench('C) Flop exact vs exact (990)', () => {
    engine.calculate({
      heroCards: ['As', 'Ks'],
      opponentMode: 'EXACT',
      opponentCards: ['Qh', 'Qd'],
      board: ['Js', 'Tc', '2c'],
    })
  })

  bench('D) Preflop random MC 50k', () => {
    engine.calculate({
      heroCards: ['As', 'Ah'],
      opponentMode: 'RANDOM',
      board: [],
      iterations: MC_PRESETS.normal,
      seed: 42,
    })
  })

  bench('E) Flop random MC 50k', () => {
    engine.calculate({
      heroCards: ['As', 'Ks'],
      opponentMode: 'RANDOM',
      board: ['Qs', 'Jd', '2c'],
      iterations: MC_PRESETS.normal,
      seed: 42,
    })
  })

  // Warm evaluator path
  bench('Evaluator 100k random 7-card', () => {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
    const suits = ['c', 'd', 'h', 's'] as const
    for (let i = 0; i < 100_000; i += 1) {
      const cards: Card[] = []
      const used = new Set<string>()
      while (cards.length < 7) {
        const card = `${ranks[i % 13]!}${suits[(i + cards.length) % 4]!}` as Card
        if (used.has(card)) continue
        used.add(card)
        cards.push(card)
      }
      evaluator.evaluate(cards)
    }
  })
}

main()
