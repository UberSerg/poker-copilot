import type { EquityResult } from '../engine/equity/types'

export type EquityStatus = 'IDLE' | 'CALCULATING' | 'SUCCESS' | 'ERROR'

export type PrecisionPreset = 'fast' | 'normal' | 'high'

/** Transient worker UI state — not part of PokerState / AnalysisState. */
export interface EquityCalculationState {
  status: EquityStatus
  requestId: number | null
  result: EquityResult | null
  errorMessage: string | null
}

export function createInitialEquityUiState(): EquityCalculationState {
  return {
    status: 'IDLE',
    requestId: null,
    result: null,
    errorMessage: null,
  }
}
