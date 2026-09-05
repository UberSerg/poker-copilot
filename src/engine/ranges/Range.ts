import type { Card } from '../../domain/cards/Card'
import { ALL_HAND_CLASSES } from './allHandClasses'
import { formatHandClass, type HandClass } from './HandClass'
import {
  canonicalCombo,
  comboKey,
  expandHandClass,
  type WeightedCombo,
} from './RangeCombo'

/**
 * Immutable weighted range: physical combo key → weight in [0, 1].
 * Weight 0 combos are omitted.
 */
export class PokerRange {
  private readonly weights: ReadonlyMap<string, number>

  private constructor(weights: ReadonlyMap<string, number>) {
    this.weights = weights
  }

  static empty(): PokerRange {
    return new PokerRange(new Map())
  }

  static fromCombos(combos: readonly WeightedCombo[]): PokerRange {
    const map = new Map<string, number>()
    for (const combo of combos) {
      if (combo.weight <= 0) continue
      const key = comboKey(combo.cards[0], combo.cards[1])
      const weight = Math.min(1, Math.max(0, combo.weight))
      map.set(key, weight)
    }
    return new PokerRange(map)
  }

  static fromHandClassWeights(classWeights: ReadonlyMap<string, number>): PokerRange {
    const map = new Map<string, number>()
    for (const hand of ALL_HAND_CLASSES) {
      const key = formatHandClass(hand)
      const weight = classWeights.get(key) ?? 0
      if (weight <= 0) continue
      const clamped = Math.min(1, Math.max(0, weight))
      for (const cards of expandHandClass(hand)) {
        map.set(comboKey(cards[0], cards[1]), clamped)
      }
    }
    return new PokerRange(map)
  }

  get size(): number {
    return this.weights.size
  }

  getWeight(a: Card, b: Card): number {
    return this.weights.get(comboKey(a, b)) ?? 0
  }

  has(a: Card, b: Card): boolean {
    return this.weights.has(comboKey(a, b))
  }

  toCombos(): WeightedCombo[] {
    const out: WeightedCombo[] = []
    for (const [key, weight] of this.weights) {
      const [a, b] = key.split('|') as [Card, Card]
      out.push({ cards: canonicalCombo(a, b), weight })
    }
    return out
  }

  /** Hand-class level weights (max weight among physical combos of that class). */
  toHandClassWeights(): Map<string, number> {
    const map = new Map<string, number>()
    for (const hand of ALL_HAND_CLASSES) {
      const key = formatHandClass(hand)
      let max = 0
      for (const cards of expandHandClass(hand)) {
        const w = this.weights.get(comboKey(cards[0], cards[1])) ?? 0
        if (w > max) max = w
      }
      if (max > 0) map.set(key, max)
    }
    return map
  }

  withHandClassWeight(hand: HandClass, weight: number): PokerRange {
    const map = new Map(this.weights)
    const clamped = Math.min(1, Math.max(0, weight))
    for (const cards of expandHandClass(hand)) {
      const key = comboKey(cards[0], cards[1])
      if (clamped <= 0) map.delete(key)
      else map.set(key, clamped)
    }
    return new PokerRange(map)
  }

  mergeHandClassWeight(hand: HandClass, weight: number): PokerRange {
    return this.withHandClassWeight(hand, weight)
  }

  serialize(): { combos: { cards: [Card, Card]; weight: number }[] } {
    return {
      combos: this.toCombos().map((c) => ({
        cards: [c.cards[0], c.cards[1]],
        weight: c.weight,
      })),
    }
  }

  static deserialize(data: {
    combos: { cards: readonly [Card, Card]; weight: number }[]
  }): PokerRange {
    return PokerRange.fromCombos(data.combos)
  }
}
