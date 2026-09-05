import { getRank, type Card, type Rank } from '../../domain/cards/Card'
import { RANK_LABEL } from '../../domain/cards/Card'
import type { EvaluatedHand, HandCategory } from './HandEvaluator'
import { rankValueOf } from './nativeEvaluator'

const RANK_RU: Record<Rank, { singular: string; plural: string; genitive: string }> = {
  '2': { singular: 'двойка', plural: 'двойки', genitive: 'двоек' },
  '3': { singular: 'тройка', plural: 'тройки', genitive: 'троек' },
  '4': { singular: 'четвёрка', plural: 'четвёрки', genitive: 'четвёрок' },
  '5': { singular: 'пятёрка', plural: 'пятёрки', genitive: 'пятёрок' },
  '6': { singular: 'шестёрка', plural: 'шестёрки', genitive: 'шестёрок' },
  '7': { singular: 'семёрка', plural: 'семёрки', genitive: 'семёрок' },
  '8': { singular: 'восьмёрка', plural: 'восьмёрки', genitive: 'восьмёрок' },
  '9': { singular: 'девятка', plural: 'девятки', genitive: 'девяток' },
  T: { singular: 'десятка', plural: 'десятки', genitive: 'десяток' },
  J: { singular: 'валет', plural: 'валеты', genitive: 'валетов' },
  Q: { singular: 'дама', plural: 'дамы', genitive: 'дам' },
  K: { singular: 'король', plural: 'короли', genitive: 'королей' },
  A: { singular: 'туз', plural: 'тузы', genitive: 'тузов' },
}

function rankFromValue(value: number): Rank {
  const found = (Object.keys(RANK_RU) as Rank[]).find((rank) => rankValueOf(rank) === value)
  if (!found) {
    throw new Error(`Unknown rank value ${value}`)
  }
  return found
}

function isRoyal(hand: EvaluatedHand): boolean {
  return hand.category === 'STRAIGHT_FLUSH' && hand.tiebreakers[0] === 14
}

export function formatEvaluatedHandRu(hand: EvaluatedHand): string {
  const tb = hand.tiebreakers
  switch (hand.category) {
    case 'HIGH_CARD': {
      const high = RANK_RU[rankFromValue(tb[0]!)]
      return `Старшая карта: ${high.singular}`
    }
    case 'PAIR': {
      const pair = RANK_RU[rankFromValue(tb[0]!)]
      const kicker = RANK_RU[rankFromValue(tb[1]!)]
      return `Пара ${pair.genitive}, ${kicker.singular} кикер`
    }
    case 'TWO_PAIR': {
      const high = RANK_RU[rankFromValue(tb[0]!)]
      const low = RANK_RU[rankFromValue(tb[1]!)]
      return `Две пары: ${high.plural} и ${low.plural}`
    }
    case 'THREE_OF_A_KIND': {
      const trips = RANK_RU[rankFromValue(tb[0]!)]
      return `Сет ${trips.genitive}`
    }
    case 'STRAIGHT': {
      const high = RANK_RU[rankFromValue(tb[0]!)]
      return `Стрит до ${high.genitive === 'тузов' ? 'туза' : high.singular === 'дама' ? 'дамы' : high.singular === 'король' ? 'короля' : high.singular}`
    }
    case 'FLUSH': {
      const high = RANK_RU[rankFromValue(tb[0]!)]
      return `Флеш, ${high.singular} старший`
    }
    case 'FULL_HOUSE': {
      const trips = RANK_RU[rankFromValue(tb[0]!)]
      const pair = RANK_RU[rankFromValue(tb[1]!)]
      return `Фулл-хаус: ${trips.plural} поверх ${pair.genitive}`
    }
    case 'FOUR_OF_A_KIND': {
      const quads = RANK_RU[rankFromValue(tb[0]!)]
      return `Каре ${quads.genitive}`
    }
    case 'STRAIGHT_FLUSH': {
      if (isRoyal(hand)) {
        return 'Роял-флеш'
      }
      const high = RANK_RU[rankFromValue(tb[0]!)]
      return `Стрит-флеш до ${high.singular === 'дама' ? 'дамы' : high.singular === 'король' ? 'короля' : high.singular === 'туз' ? 'туза' : high.singular}`
    }
  }
}

export function formatCategoryRu(category: HandCategory, hand?: EvaluatedHand): string {
  if (hand && isRoyal(hand)) {
    return 'Роял-флеш'
  }
  const map: Record<HandCategory, string> = {
    HIGH_CARD: 'Старшая карта',
    PAIR: 'Пара',
    TWO_PAIR: 'Две пары',
    THREE_OF_A_KIND: 'Сет',
    STRAIGHT: 'Стрит',
    FLUSH: 'Флеш',
    FULL_HOUSE: 'Фулл-хаус',
    FOUR_OF_A_KIND: 'Каре',
    STRAIGHT_FLUSH: 'Стрит-флеш',
  }
  return map[category]
}

export function describeBestFive(cards: readonly Card[]): string {
  return cards.map((card) => `${RANK_LABEL[getRank(card)]}`).join(' ')
}
