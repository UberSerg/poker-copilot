import { describe, expect, it } from 'vitest'
import { ALL_HAND_CLASSES, allHandClasses } from './allHandClasses'
import { applyBlockers } from './blockers'
import { formatRange } from './formatter'
import { formatHandClass, createHandClass } from './HandClass'
import { parseRange } from './parser'
import { PokerRange } from './Range'
import { comboKey, expandHandClass, expectedComboCount } from './RangeCombo'
import { buildRangeDistribution, sampleWeightedCombo } from './sampler'
import { computeRangeStats } from './stats'
import { createSeededRandom } from '../equity/rng'

describe('HandClass / expansion', () => {
  it('has exactly 169 unique hand classes', () => {
    const all = allHandClasses()
    expect(all).toHaveLength(169)
    expect(ALL_HAND_CLASSES).toHaveLength(169)
    const keys = new Set(all.map(formatHandClass))
    expect(keys.size).toBe(169)
  })

  it('expands AA=6, AKs=4, AKo=12', () => {
    expect(expandHandClass(createHandClass('A', 'A', 'PAIR'))).toHaveLength(6)
    expect(expandHandClass(createHandClass('A', 'K', 'SUITED'))).toHaveLength(4)
    expect(expandHandClass(createHandClass('A', 'K', 'OFFSUIT'))).toHaveLength(12)
    expect(expectedComboCount(createHandClass('A', 'A', 'PAIR'))).toBe(6)
  })

  it('all 169 classes expand to 1326 unique combos', () => {
    const keys = new Set<string>()
    for (const hand of ALL_HAND_CLASSES) {
      for (const cards of expandHandClass(hand)) {
        keys.add(comboKey(cards[0], cards[1]))
      }
    }
    expect(keys.size).toBe(1326)
  })

  it('combo key is unordered', () => {
    expect(comboKey('As', 'Kh')).toBe(comboKey('Kh', 'As'))
  })
})

describe('parseRange', () => {
  it('parses singles and lists', () => {
    const r = parseRange('AA, KK, QQ, AKs, AKo')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.classWeights.get('AA')).toBe(1)
    expect(r.classWeights.get('AKs')).toBe(1)
    expect(r.range.size).toBe(6 + 6 + 6 + 4 + 12)
  })

  it('parses pair plus', () => {
    const r = parseRange('TT+')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.classWeights.has('TT')).toBe(true)
    expect(r.classWeights.has('AA')).toBe(true)
    expect(r.classWeights.has('99')).toBe(false)
  })

  it('parses 22+', () => {
    const r = parseRange('22+')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.classWeights.size).toBe(13)
  })

  it('parses non-pair plus', () => {
    const r = parseRange('AJs+')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([...r.classWeights.keys()].sort()).toEqual(['AJs', 'AKs', 'AQs'])
  })

  it('parses ATo+', () => {
    const r = parseRange('ATo+')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([...r.classWeights.keys()].sort()).toEqual(['AJo', 'AKo', 'AQo', 'ATo'])
  })

  it('parses pair interval 66-TT', () => {
    const r = parseRange('66-TT')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([...r.classWeights.keys()].sort()).toEqual(['66', '77', '88', '99', 'TT'])
  })

  it('parses suited interval ATs-AQs', () => {
    const r = parseRange('ATs-AQs')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect([...r.classWeights.keys()].sort()).toEqual(['AJs', 'AQs', 'ATs'])
  })

  it('ignores whitespace and dedupes duplicates', () => {
    const r = parseRange(' AA , AA , QQ+ ')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.range.size).toBe(6 + 6 + 6) // AA KK QQ once each
  })

  it('rejects invalid tokens', () => {
    for (const bad of ['AK', 'AAo', 'AAs', '22s', 'KAs', 'AXs', 'AKx', 'QQ++']) {
      const r = parseRange(bad)
      expect(r.ok).toBe(false)
    }
  })

  it('parses weights and last-token-wins', () => {
    const r = parseRange('QQ+, KK:50%')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.classWeights.get('QQ')).toBe(1)
    expect(r.classWeights.get('KK')).toBe(0.5)
    expect(r.classWeights.get('AA')).toBe(1)
  })

  it('parses AKs:50% physical weighted count', () => {
    const r = parseRange('AKs:50%')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.range.size).toBe(4)
    const stats = computeRangeStats(r.range)
    expect(stats.weightedRawCombos).toBeCloseTo(2, 5)
  })

  it('rejects invalid weights', () => {
    expect(parseRange('AA:-10%').ok).toBe(false)
    expect(parseRange('AA:150%').ok).toBe(false)
    expect(parseRange('AA:abc%').ok).toBe(false)
  })

  it('formatRange round-trips weights', () => {
    const r = parseRange('AA, KK:50%, AKs:25%')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const text = formatRange(r.range)
    const again = parseRange(text)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.classWeights.get('AA')).toBe(1)
    expect(again.classWeights.get('KK')).toBe(0.5)
    expect(again.classWeights.get('AKs')).toBe(0.25)
  })
})

describe('blockers', () => {
  it('AA + As blocker => 3 combos', () => {
    const r = parseRange('AA')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const blocked = applyBlockers(r.range, ['As'])
    expect(blocked.size).toBe(3)
  })

  it('AA + As Ah => 1 combo', () => {
    const r = parseRange('AA')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const blocked = applyBlockers(r.range, ['As', 'Ah'])
    expect(blocked.size).toBe(1)
    expect(blocked.has('Ad', 'Ac')).toBe(true)
  })

  it('suited board blockers remove AKs combos', () => {
    const r = parseRange('AKs')
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const blocked = applyBlockers(r.range, ['As', 'Ks', 'Qs'])
    expect(blocked.size).toBe(3)
  })
})

describe('weighted sampler', () => {
  it('samples AA:100% vs KK:50% ~ 2:1 with fixed seed', () => {
    const range = PokerRange.fromHandClassWeights(
      new Map([
        ['AA', 1],
        ['KK', 0.5],
      ]),
    )
    const dist = buildRangeDistribution(range.toCombos())
    const rng = createSeededRandom(42)
    let aa = 0
    let kk = 0
    const n = 20_000
    for (let i = 0; i < n; i += 1) {
      const combo = sampleWeightedCombo(dist, rng)
      if (combo.cards[0][0] === 'A') aa += 1
      else kk += 1
    }
    const ratio = aa / kk
    expect(ratio).toBeGreaterThan(1.7)
    expect(ratio).toBeLessThan(2.3)
  })
})
