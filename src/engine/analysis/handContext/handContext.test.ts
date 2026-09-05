import { describe, expect, it } from 'vitest'
import { analyzeHandContext } from './HandContextAnalyzer'

describe('HandContextAnalyzer', () => {
  it('top pair AQ on Q83', () => {
    const h = analyzeHandContext(['As', 'Qd'], ['Qc', '8h', '3s'])
    expect(h.pairContext).toBe('TOP_PAIR')
    expect(h.strengthClass).toBe('STRONG')
  })

  it('overpair AA on K72', () => {
    const h = analyzeHandContext(['As', 'Ah'], ['Kd', '7c', '2h'])
    expect(h.pairContext).toBe('OVERPAIR')
    expect(h.strengthClass).toBe('STRONG')
  })

  it('flush draw AJs on K72ss', () => {
    const h = analyzeHandContext(['As', 'Js'], ['Ks', '7s', '2d'])
    expect(h.drawContext).toBe('FLUSH_DRAW')
    expect(['MEDIUM', 'WEAK']).toContain(h.strengthClass)
  })

  it('second pair', () => {
    const h = analyzeHandContext(['8s', '7d'], ['Ac', '8h', '3s'])
    expect(h.pairContext).toBe('SECOND_PAIR')
  })

  it('bottom pair', () => {
    const h = analyzeHandContext(['3s', '2d'], ['Ac', '8h', '3c'])
    expect(h.pairContext).toBe('BOTTOM_PAIR')
    expect(h.strengthClass).toBe('WEAK')
  })

  it('set', () => {
    const h = analyzeHandContext(['8s', '8d'], ['8c', 'Kh', '2s'])
    expect(h.madeHandCategory).toBe('THREE_OF_A_KIND')
    expect(h.strengthClass).toBe('STRONG')
  })

  it('two pair', () => {
    const h = analyzeHandContext(['As', 'Kd'], ['Ac', 'Kh', '2s'])
    expect(h.madeHandCategory).toBe('TWO_PAIR')
    expect(h.strengthClass).toBe('STRONG')
  })

  it('straight', () => {
    const h = analyzeHandContext(['Js', 'Td'], ['9c', '8h', '7s'])
    expect(h.madeHandCategory).toBe('STRAIGHT')
  })

  it('flush made', () => {
    const h = analyzeHandContext(['As', '2s'], ['Ks', '9s', '3s'])
    expect(h.madeHandCategory).toBe('FLUSH')
    expect(h.drawContext).toBe('NONE')
  })

  it('straight draw heuristic', () => {
    const h = analyzeHandContext(['Js', 'Td'], ['9c', '2h', '3s'])
    expect(['STRAIGHT_DRAW', 'NONE', 'COMBO_DRAW']).toContain(h.drawContext)
  })

  it('combo draw suited connector on wet', () => {
    const h = analyzeHandContext(['9s', '8s'], ['7s', '6d', '2c'])
    expect(['COMBO_DRAW', 'FLUSH_DRAW', 'STRAIGHT_DRAW']).toContain(h.drawContext)
  })

  it('preflop', () => {
    const h = analyzeHandContext(['As', 'Kd'], [])
    expect(h.madeHandCategory).toBe('PREFLOP')
  })

  it('high card weak', () => {
    const h = analyzeHandContext(['7c', '2d'], ['As', 'Kh', 'Qd'])
    expect(h.strengthClass).toBe('WEAK')
  })

  it('full house monster', () => {
    const h = analyzeHandContext(['As', 'Ad'], ['Ac', 'Kd', 'Kh'])
    expect(h.strengthClass).toBe('MONSTER')
  })

  it('description non-empty postflop', () => {
    const h = analyzeHandContext(['As', 'Qd'], ['Qc', '8h', '3s'])
    expect(h.description.length).toBeGreaterThan(0)
  })
})
