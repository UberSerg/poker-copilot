export const STREETS = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const

export type Street = (typeof STREETS)[number]

export function nextStreet(street: Street): Street | null {
  switch (street) {
    case 'PREFLOP':
      return 'FLOP'
    case 'FLOP':
      return 'TURN'
    case 'TURN':
      return 'RIVER'
    case 'RIVER':
      return null
  }
}
