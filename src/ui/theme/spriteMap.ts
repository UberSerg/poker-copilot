import type { CSSProperties } from 'react'
import type { Rank, Suit } from '../../domain/cards/Card'
import { suitSheetUrl, pokerAssets } from './assetMap'

/** Sheet grid: 4 columns × 4 rows. Rank order A K Q J / T 9 8 7 / 6 5 4 3 / 2. */
const RANK_INDEX: Record<Rank, number> = {
  A: 0,
  K: 1,
  Q: 2,
  J: 3,
  T: 4,
  '9': 5,
  '8': 6,
  '7': 7,
  '6': 8,
  '5': 9,
  '4': 10,
  '3': 11,
  '2': 12,
}

const COLS = 4
const ROWS = 4

function cellPosition(col: number, row: number, cols: number, rows: number): string {
  const x = cols <= 1 ? 0 : (col / (cols - 1)) * 100
  const y = rows <= 1 ? 0 : (row / (rows - 1)) * 100
  return `${x}% ${y}%`
}

export function cardFaceStyle(rank: Rank, suit: Suit): CSSProperties {
  const index = RANK_INDEX[rank]
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return {
    backgroundImage: `url(${suitSheetUrl(suit)})`,
    backgroundSize: `${COLS * 100}% ${ROWS * 100}%`,
    backgroundPosition: cellPosition(col, row, COLS, ROWS),
    backgroundRepeat: 'no-repeat',
  }
}

/** First large card-back cell on backs sheet (approx top-left of useful faces). */
export function cardBackStyle(): CSSProperties {
  return {
    backgroundImage: `url(${pokerAssets.cards.backsAndFrames.url})`,
    backgroundSize: '400% 400%',
    backgroundPosition: '0% 0%',
    backgroundRepeat: 'no-repeat',
  }
}

export function cardEmptyStyle(): CSSProperties {
  return {
    backgroundImage: `url(${pokerAssets.cards.backsAndFrames.url})`,
    backgroundSize: '400% 400%',
    backgroundPosition: '100% 0%',
    backgroundRepeat: 'no-repeat',
    opacity: 0.55,
  }
}

export type ActionButtonArt =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'nextStreet'
  | 'newHand'
  | 'undo'

/** 3×3 grid on static_buttons.png */
const BUTTON_CELLS: Record<ActionButtonArt, { col: number; row: number }> = {
  fold: { col: 0, row: 0 },
  check: { col: 1, row: 0 },
  call: { col: 2, row: 0 },
  bet: { col: 0, row: 1 },
  raise: { col: 1, row: 1 },
  nextStreet: { col: 2, row: 1 },
  newHand: { col: 0, row: 2 },
  undo: { col: 1, row: 2 },
}

export function actionButtonStyle(kind: ActionButtonArt): CSSProperties {
  const { col, row } = BUTTON_CELLS[kind]
  return {
    backgroundImage: `url(${pokerAssets.buttons.url})`,
    backgroundSize: '300% 300%',
    backgroundPosition: cellPosition(col, row, 3, 3),
    backgroundRepeat: 'no-repeat',
  }
}

export function tableBackgroundStyle(): CSSProperties {
  return {
    backgroundImage: `url(${pokerAssets.table.url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center 18%',
    backgroundRepeat: 'no-repeat',
  }
}
