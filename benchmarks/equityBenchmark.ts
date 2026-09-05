/**
 * Equity / range micro-benchmarks.
 * Run: npm run benchmark
 */
import { performance } from 'node:perf_hooks'
import { createEquityEngine, MC_PRESETS } from '../src/engine/equity'
import { applyBlockers } from '../src/engine/ranges/blockers'
import { parseRange } from '../src/engine/ranges/parser'
import { ALL_HAND_CLASSES } from '../src/engine/ranges/allHandClasses'
import { formatHandClass } from '../src/engine/ranges/HandClass'
import { PokerRange } from '../src/engine/ranges/Range'

const engine = createEquityEngine()

function bench(label: string, fn: () => void): number {
  // Warm once
  fn()
  const start = performance.now()
  fn()
  const ms = performance.now() - start
  console.log(`${label}: ${ms.toFixed(1)} ms`)
  return ms
}

function rangeCombos(text: string, hero: readonly [string, string], board: readonly string[] = []) {
  const parsed = parseRange(text)
  if (!parsed.ok) throw new Error(parsed.errors[0]?.messageRu)
  const available = applyBlockers(parsed.range, [...hero, ...board] as never)
  return available.toCombos()
}

function percentRange(pct: number): PokerRange {
  const map = new Map<string, number>()
  const n = Math.round(ALL_HAND_CLASSES.length * pct)
  for (let i = 0; i < n; i += 1) {
    map.set(formatHandClass(ALL_HAND_CLASSES[i]!), 1)
  }
  return PokerRange.fromHandClassWeights(map)
}

function main(): void {
  console.log('Poker Copilot equity / range benchmarks')
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

  bench('F) Range parse wide text', () => {
    parseRange('22+, ATs+, KQo+, QJs, JTs, T9s, 98s, 87s, 76s, A5s-A2s, K9s+, QTo+')
  })

  bench('G) Blockers on 50% range', () => {
    const range = percentRange(0.5)
    applyBlockers(range, ['As', 'Kh', '2c', '7d', '9h'])
  })

  const hero10 = ['As', 'Qd'] as const
  const combos10 = rangeCombos('TT+, AQs+, AKo, AJs, KQs', hero10)
  bench('H) Preflop ~10% range MC 50k', () => {
    engine.calculate({
      heroCards: hero10,
      opponentMode: 'RANGE',
      board: [],
      rangeCombos: combos10,
      iterations: MC_PRESETS.normal,
      seed: 7,
    })
  })

  const hero50 = ['As', 'Ah'] as const
  const range50 = percentRange(0.5)
  const combos50 = applyBlockers(range50, [...hero50]).toCombos()
  bench('I) Preflop 50% range MC 50k', () => {
    engine.calculate({
      heroCards: hero50,
      opponentMode: 'RANGE',
      board: [],
      rangeCombos: combos50,
      iterations: MC_PRESETS.normal,
      seed: 7,
    })
  })

  const heroFlop = ['As', 'Ks'] as const
  const flop = ['Qs', 'Jd', '2c'] as const
  const combosFlop = rangeCombos('TT+, AQs+, AKo', heroFlop, flop)
  bench('J) Flop range MC 50k', () => {
    engine.calculate({
      heroCards: heroFlop,
      opponentMode: 'RANGE',
      board: [...flop],
      rangeCombos: combosFlop,
      iterations: MC_PRESETS.normal,
      seed: 7,
    })
  })

  const turnCombos = rangeCombos('QQ+, AKs', ['As', 'Kd'], ['Jc', 'Ts', '2c', '7h'])
  bench('K) Turn small range exact', () => {
    engine.calculate({
      heroCards: ['As', 'Kd'],
      opponentMode: 'RANGE',
      board: ['Jc', 'Ts', '2c', '7h'],
      rangeCombos: turnCombos,
    })
  })

  const riverCombos = applyBlockers(percentRange(1), [
    'As',
    'Ah',
    '2c',
    '7d',
    '9h',
    'Jc',
    '3s',
  ]).toCombos()
  bench('L) River vs full range exact', () => {
    engine.calculate({
      heroCards: ['As', 'Ah'],
      opponentMode: 'RANGE',
      board: ['2c', '7d', '9h', 'Jc', '3s'],
      rangeCombos: riverCombos,
    })
  })
}

main()
