export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
export type Rank = (typeof RANKS)[number]

export const SUITS = ['c', 'd', 'h', 's'] as const
export type Suit = (typeof SUITS)[number]

export type Card = `${Rank}${Suit}`

export const SUIT_SYMBOL: Record<Suit, string> = {
  c: '♣',
  d: '♦',
  h: '♥',
  s: '♠',
}

export const RANK_LABEL: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  T: 'T',
  J: 'J',
  Q: 'Q',
  K: 'K',
  A: 'A',
}

export function isRank(value: string): value is Rank {
  return (RANKS as readonly string[]).includes(value)
}

export function isSuit(value: string): value is Suit {
  return (SUITS as readonly string[]).includes(value)
}

export function createCard(rank: Rank, suit: Suit): Card {
  return `${rank}${suit}`
}

export function cardKey(card: Card): string {
  return card
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a === b
}

export function parseCard(raw: string): Card | null {
  if (raw.length !== 2) {
    return null
  }
  const rank = raw[0]
  const suit = raw[1]
  if (!rank || !suit || !isRank(rank) || !isSuit(suit)) {
    return null
  }
  return createCard(rank, suit)
}

export function formatCard(card: Card): string {
  const rank = card[0] as Rank
  const suit = card[1] as Suit
  return `${RANK_LABEL[rank]}${SUIT_SYMBOL[suit]}`
}

export function getRank(card: Card): Rank {
  return card[0] as Rank
}

export function getSuit(card: Card): Suit {
  return card[1] as Suit
}

export function isRedSuit(suit: Suit): boolean {
  return suit === 'h' || suit === 'd'
}
