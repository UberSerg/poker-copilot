import { describe, expect, it } from 'vitest'
import type { Card } from '../../domain/cards/Card'
import { createHandEvaluator } from './nativeEvaluator'
import { formatEvaluatedHandRu } from './formatRu'

const evaluator = createHandEvaluator()

function c(...cards: Card[]): Card[] {
  return cards
}

describe('HandEvaluator golden fixtures', () => {
  it('high card', () => {
    const hand = evaluator.evaluate(c('As', 'Kd', '7c', '4h', '2s'))
    expect(hand.category).toBe('HIGH_CARD')
    expect(hand.tiebreakers[0]).toBe(14)
  })

  it('one pair', () => {
    const hand = evaluator.evaluate(c('As', 'Ad', 'Kc', '7h', '2s'))
    expect(hand.category).toBe('PAIR')
    expect(hand.tiebreakers[0]).toBe(14)
    expect(hand.tiebreakers[1]).toBe(13)
  })

  it('two pair', () => {
    const hand = evaluator.evaluate(c('Ks', 'Kd', 'Tc', 'Th', '2s'))
    expect(hand.category).toBe('TWO_PAIR')
    expect(formatEvaluatedHandRu(hand)).toContain('короли')
  })

  it('trips', () => {
    const hand = evaluator.evaluate(c('8s', '8d', '8c', 'Ah', '2s'))
    expect(hand.category).toBe('THREE_OF_A_KIND')
  })

  it('straight broadway', () => {
    const hand = evaluator.evaluate(c('Ts', 'Jd', 'Qc', 'Kh', 'As'))
    expect(hand.category).toBe('STRAIGHT')
    expect(hand.tiebreakers[0]).toBe(14)
  })

  it('wheel straight A2345', () => {
    const hand = evaluator.evaluate(c('As', '2d', '3c', '4h', '5s'))
    expect(hand.category).toBe('STRAIGHT')
    expect(hand.tiebreakers[0]).toBe(5)
  })

  it('flush', () => {
    const hand = evaluator.evaluate(c('As', 'Js', '9s', '4s', '2s'))
    expect(hand.category).toBe('FLUSH')
    expect(hand.tiebreakers[0]).toBe(14)
  })

  it('full house', () => {
    const hand = evaluator.evaluate(c('Qs', 'Qd', 'Qc', '8h', '8s'))
    expect(hand.category).toBe('FULL_HOUSE')
    expect(hand.tiebreakers).toEqual([12, 8])
  })

  it('full house prefers higher trips over extra pair AAA KK QQ', () => {
    const hand = evaluator.evaluate(c('As', 'Ad', 'Ac', 'Kh', 'Kd', 'Qs', 'Qd'))
    expect(hand.category).toBe('FULL_HOUSE')
    expect(hand.tiebreakers).toEqual([14, 13])
    expect(hand.bestFive).toHaveLength(5)
  })

  it('double trips makes full house AAA KKK 2', () => {
    const hand = evaluator.evaluate(c('As', 'Ad', 'Ac', 'Kh', 'Kd', 'Kc', '2s'))
    expect(hand.category).toBe('FULL_HOUSE')
    expect(hand.tiebreakers).toEqual([14, 13])
  })

  it('quads with kicker', () => {
    const hand = evaluator.evaluate(c('5s', '5d', '5c', '5h', 'As', 'Kd', '2c'))
    expect(hand.category).toBe('FOUR_OF_A_KIND')
    expect(hand.tiebreakers).toEqual([5, 14])
  })

  it('straight flush', () => {
    const hand = evaluator.evaluate(c('5s', '6s', '7s', '8s', '9s'))
    expect(hand.category).toBe('STRAIGHT_FLUSH')
    expect(hand.tiebreakers[0]).toBe(9)
  })

  it('royal flush is straight flush A-high', () => {
    const hand = evaluator.evaluate(c('Ts', 'Js', 'Qs', 'Ks', 'As'))
    expect(hand.category).toBe('STRAIGHT_FLUSH')
    expect(hand.tiebreakers[0]).toBe(14)
    expect(formatEvaluatedHandRu(hand)).toBe('Роял-флеш')
  })

  it('board plays tie on broadway board', () => {
    const board = c('Ac', 'Kd', 'Qh', 'Js', 'Tc')
    const hero = evaluator.evaluate([...c('2c', '2d'), ...board])
    const villain = evaluator.evaluate([...c('3c', '3d'), ...board])
    expect(evaluator.compare(hero, villain)).toBe(0)
    expect(hero.category).toBe('STRAIGHT')
  })

  it('exact tie same best five', () => {
    const a = evaluator.evaluate(c('As', 'Kd', '7c', '4h', '2s'))
    const b = evaluator.evaluate(c('Ah', 'Kc', '7d', '4s', '2c'))
    expect(evaluator.compare(a, b)).toBe(0)
  })

  it('kicker pair-of-aces: AK kicker beats AQ kicker', () => {
    const board = c('As', '8d', '3c', '2h', '7s')
    const hero = evaluator.evaluate([...c('Ad', 'Kd'), ...board])
    const villain = evaluator.evaluate([...c('Ac', 'Qd'), ...board])
    expect(hero.category).toBe('PAIR')
    expect(villain.category).toBe('PAIR')
    expect(evaluator.compare(hero, villain)).toBe(1)
  })

  it('best five of seven flush selection', () => {
    const hand = evaluator.evaluate(c('As', 'Ks', 'Qs', 'Js', '9s', '2s', '3d'))
    expect(hand.category).toBe('FLUSH')
    expect(hand.bestFive.every((card) => card.endsWith('s'))).toBe(true)
    expect(hand.tiebreakers.slice(0, 5)).toEqual([14, 13, 12, 11, 9])
  })

  it('flush picks best five from six suited', () => {
    const hand = evaluator.evaluate(c('As', 'Ks', '8s', '5s', '3s', '2s'))
    expect(hand.category).toBe('FLUSH')
    expect(hand.tiebreakers[0]).toBe(14)
    expect(hand.tiebreakers).not.toContain(2)
  })

  it('counterfeit two pair prefers board pair', () => {
    // Hero has 99, board AA KK 2 — plays AA KK 9
    const hand = evaluator.evaluate(c('9s', '9d', 'As', 'Ad', 'Kc', 'Kh', '2c'))
    expect(hand.category).toBe('TWO_PAIR')
    expect(hand.tiebreakers[0]).toBe(14)
    expect(hand.tiebreakers[1]).toBe(13)
    expect(hand.tiebreakers[2]).toBe(9)
  })

  it('quads kicker chooses highest available', () => {
    const hand = evaluator.evaluate(c('7s', '7d', '7c', '7h', 'As', 'Kd', 'Qc'))
    expect(hand.category).toBe('FOUR_OF_A_KIND')
    expect(hand.tiebreakers[1]).toBe(14)
  })

  it('compares full house orderings', () => {
    const aaaKK = evaluator.evaluate(c('As', 'Ad', 'Ac', 'Kh', 'Kd'))
    const aaaQQ = evaluator.evaluate(c('As', 'Ad', 'Ac', 'Qh', 'Qd'))
    expect(evaluator.compare(aaaKK, aaaQQ)).toBe(1)
  })
})
