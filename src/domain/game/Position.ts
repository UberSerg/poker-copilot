export const POSITIONS_6MAX = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const

export type Position = (typeof POSITIONS_6MAX)[number]

/** Clockwise action order starting from UTG. */
export const POSITION_ORDER: readonly Position[] = POSITIONS_6MAX

export function positionIndex(position: Position): number {
  return POSITION_ORDER.indexOf(position)
}

export function nextPosition(position: Position): Position {
  const index = positionIndex(position)
  return POSITION_ORDER[(index + 1) % POSITION_ORDER.length]!
}

export function positionsAfter(position: Position): Position[] {
  const start = positionIndex(position)
  const result: Position[] = []
  for (let offset = 1; offset <= POSITION_ORDER.length; offset += 1) {
    result.push(POSITION_ORDER[(start + offset) % POSITION_ORDER.length]!)
  }
  return result
}
