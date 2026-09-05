import type { PrecisionPreset } from '../equityUiState'
import type { OpponentMode } from '../../engine/equity/types'
import { PokerRange } from '../../engine/ranges/Range'
import { formatRange } from '../../engine/ranges/formatter'
import { parseRange } from '../../engine/ranges/parser'

export type { OpponentMode }

export interface AnalysisState {
  opponentMode: OpponentMode
  /** Canonical range model; empty when not in RANGE mode. */
  range: PokerRange
  /** Text mirror of range (user may edit; synced from model after matrix edits). */
  rangeText: string
  rangeParseError: string | null
  equityPrecision: PrecisionPreset
  rangeEditorOpen: boolean
}

export function createInitialAnalysisState(): AnalysisState {
  return {
    opponentMode: 'RANDOM',
    range: PokerRange.empty(),
    rangeText: '',
    rangeParseError: null,
    equityPrecision: 'normal',
    rangeEditorOpen: true,
  }
}

export function setOpponentMode(
  state: AnalysisState,
  opponentMode: OpponentMode,
): AnalysisState {
  return { ...state, opponentMode }
}

export function setRangeFromText(state: AnalysisState, text: string): AnalysisState {
  const parsed = parseRange(text)
  if (!parsed.ok) {
    const first = parsed.errors[0]
    return {
      ...state,
      rangeText: text,
      rangeParseError: first?.messageRu ?? 'Ошибка диапазона',
    }
  }
  return {
    ...state,
    rangeText: text,
    range: parsed.range,
    rangeParseError: null,
  }
}

export function setRangeModel(state: AnalysisState, range: PokerRange): AnalysisState {
  return {
    ...state,
    range,
    rangeText: formatRange(range),
    rangeParseError: null,
  }
}

export function setEquityPrecision(
  state: AnalysisState,
  equityPrecision: PrecisionPreset,
): AnalysisState {
  return { ...state, equityPrecision }
}
