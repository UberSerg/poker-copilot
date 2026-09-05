import type { Position } from '../../../domain/game/Position'

export type PositionCategory = 'EARLY' | 'MIDDLE' | 'LATE' | 'BLIND'

export interface PositionContext {
  position: Position
  category: PositionCategory
  description: string[]
}

const MAP: Record<Position, PositionCategory> = {
  UTG: 'EARLY',
  HJ: 'MIDDLE',
  CO: 'MIDDLE',
  BTN: 'LATE',
  SB: 'BLIND',
  BB: 'BLIND',
}

const LABEL: Record<PositionCategory, string> = {
  EARLY: 'Ранняя позиция',
  MIDDLE: 'Средняя позиция',
  LATE: 'Поздняя позиция',
  BLIND: 'Блайнды',
}

export function analyzePositionContext(position: Position): PositionContext {
  const category = MAP[position]
  return {
    position,
    category,
    description: [`${position}: ${LABEL[category]}`],
  }
}
