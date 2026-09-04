import { describe, expect, it } from 'vitest'
import { cardsEqual, createCard, formatCard, parseCard } from './Card'
import { FULL_DECK, createFullDeck } from './deck'
import { availableCards, collectUsedCards } from './cardUtils'
import { bbToChips, chipsToBb } from '../math/chips'

describe('cards', () => {
  it('deck contains exactly 52 unique cards', () => {
    expect(FULL_DECK).toHaveLength(52)
    expect(new Set(FULL_DECK).size).toBe(52)
    expect(createFullDeck()).toHaveLength(52)
  })

  it('parses and formats cards', () => {
    const card = createCard('A', 's')
    expect(parseCard('As')).toBe(card)
    expect(formatCard(card)).toBe('A♠')
    expect(cardsEqual(card, 'As')).toBe(true)
  })

  it('tracks used cards and releases on replace', () => {
    const used = collectUsedCards(['As', 'Kh', null])
    expect(used.has('As')).toBe(true)
    expect(availableCards(used)).toHaveLength(50)
    used.delete('As')
    expect(availableCards(used)).toHaveLength(51)
  })
})

describe('chips', () => {
  it('converts BB <-> chips with integer chips', () => {
    expect(bbToChips(100, 100)).toBe(10000)
    expect(bbToChips(2.5, 100)).toBe(250)
    expect(chipsToBb(250, 100)).toBe(2.5)
    expect(chipsToBb(150, 100)).toBe(1.5)
  })
})
