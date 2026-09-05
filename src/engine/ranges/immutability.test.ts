import { describe, expect, it } from 'vitest'
import { parseRange } from './parser'
import { applyBlockers } from './blockers'
import { PokerRange } from './Range'

describe('range immutability', () => {
  it('applyBlockers does not mutate source range', () => {
    const parsed = parseRange('AA,KK,AKs')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const before = parsed.range.size
    const serialized = parsed.range.serialize()
    const blocked = applyBlockers(parsed.range, ['As', 'Kh'])
    expect(parsed.range.size).toBe(before)
    expect(parsed.range.serialize()).toEqual(serialized)
    expect(blocked.size).toBeLessThan(before)
  })

  it('withHandClassWeight returns new range', () => {
    const empty = PokerRange.empty()
    const parsed = parseRange('AA')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const next = empty.withHandClassWeight(
      [...parsed.range.toHandClassWeights().keys()][0]
        ? { highRank: 'A', lowRank: 'A', suitedness: 'PAIR' }
        : { highRank: 'A', lowRank: 'A', suitedness: 'PAIR' },
      1,
    )
    expect(empty.size).toBe(0)
    expect(next.size).toBe(6)
  })

  it('deserialize round-trip', () => {
    const parsed = parseRange('QQ:75%, AKs:50%')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const again = PokerRange.deserialize(parsed.range.serialize())
    expect(again.toHandClassWeights().get('QQ')).toBe(0.75)
    expect(again.toHandClassWeights().get('AKs')).toBe(0.5)
  })

  it('estimateExactScenarios for range uses combo × board completions', async () => {
    const { estimateExactScenarios } = await import('../equity/exact')
    const parsed = parseRange('AA')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const available = applyBlockers(parsed.range, ['Ks', 'Kh'])
    // 6 AA combos, river complete → 6 scenarios
    const n = estimateExactScenarios({
      heroCards: ['Ks', 'Kh'],
      board: ['2c', '7d', '9h', '3s', '8c'],
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
    })
    expect(n).toBe(6)
  })

  it('offsuit interval KTo-KQo', () => {
    const r = parseRange('KTo-KQo')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([...r.classWeights.keys()].sort()).toEqual(['KJo', 'KQo', 'KTo'])
  })
})
