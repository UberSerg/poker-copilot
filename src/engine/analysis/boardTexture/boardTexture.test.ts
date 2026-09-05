import { describe, expect, it } from 'vitest'
import { analyzeBoardTexture } from './BoardTextureAnalyzer'

describe('BoardTextureAnalyzer', () => {
  it('dry A72 rainbow', () => {
    const t = analyzeBoardTexture(['As', '7d', '2c'])
    expect(t.texture).toBe('DRY')
    expect(t.connectedness).toBe('LOW')
    expect(t.paired).toBe(false)
    expect(t.monotone).toBe(false)
  })

  it('wet JT9', () => {
    const t = analyzeBoardTexture(['Js', 'Ts', '9d'])
    expect(t.texture).toBe('WET')
    expect(t.straightPossible).toBe(true)
    expect(t.flushPossible).toBe(true)
    expect(t.connectedness).toBe('HIGH')
  })

  it('paired KK4', () => {
    const t = analyzeBoardTexture(['Ks', 'Kd', '4c'])
    expect(t.paired).toBe(true)
  })

  it('monotone flush board', () => {
    const t = analyzeBoardTexture(['As', '9s', '3s'])
    expect(t.monotone).toBe(true)
    expect(t.flushPossible).toBe(true)
  })

  it('semi-wet two-tone connected', () => {
    const t = analyzeBoardTexture(['Qh', 'Jh', '4c'])
    expect(['SEMI_WET', 'WET']).toContain(t.texture)
    expect(t.flushPossible).toBe(true)
  })

  it('preflop empty board', () => {
    const t = analyzeBoardTexture([])
    expect(t.texture).toBe('DRY')
    expect(t.description.length).toBeGreaterThan(0)
  })

  it('connected 876', () => {
    const t = analyzeBoardTexture(['8c', '7d', '6h'])
    expect(t.straightPossible).toBe(true)
    expect(t.connectedness).toBe('HIGH')
  })

  it('disconnected K83', () => {
    const t = analyzeBoardTexture(['Kc', '8d', '3h'])
    expect(t.connectedness).toBe('LOW')
  })

  it('description includes Russian labels', () => {
    const t = analyzeBoardTexture(['As', '7d', '2c'])
    expect(t.description.some((d) => d.includes('Сухой') || d.includes('связност'))).toBe(true)
  })

  it('four-flush possible on turn', () => {
    const t = analyzeBoardTexture(['As', '9s', '3c', '2s'])
    expect(t.flushPossible).toBe(true)
  })
})
