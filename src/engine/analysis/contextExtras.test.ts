import { describe, expect, it } from 'vitest'
import { analyzeBetContext } from './betContext/BetContextAnalyzer'
import { analyzePositionContext } from './positionContext/PositionContextAnalyzer'

describe('PositionContextAnalyzer', () => {
  it('maps positions', () => {
    expect(analyzePositionContext('UTG').category).toBe('EARLY')
    expect(analyzePositionContext('HJ').category).toBe('MIDDLE')
    expect(analyzePositionContext('CO').category).toBe('MIDDLE')
    expect(analyzePositionContext('BTN').category).toBe('LATE')
    expect(analyzePositionContext('SB').category).toBe('BLIND')
    expect(analyzePositionContext('BB').category).toBe('BLIND')
  })
})

describe('BetContextAnalyzer', () => {
  it('classifies sizes', () => {
    expect(analyzeBetContext(1000, 200).size).toBe('SMALL')
    expect(analyzeBetContext(1000, 400).size).toBe('MEDIUM')
    expect(analyzeBetContext(1000, 700).size).toBe('LARGE')
    expect(analyzeBetContext(1000, 1200).size).toBe('OVERBET')
  })
})
