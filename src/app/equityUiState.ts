import type { EquityResult } from '../engine/equity/types'

export type EquityStatus = 'IDLE' | 'CALCULATING' | 'SUCCESS' | 'ERROR'

export type PrecisionPreset = 'fast' | 'normal' | 'high'

export interface EquityCalculationState {
  status: EquityStatus
  opponentMode: 'EXACT' | 'RANDOM'
  precision: PrecisionPreset
  requestId: number | null
  result: EquityResult | null
  errorMessage: string | null
}

export function createInitialEquityUiState(): EquityCalculationState {
  return {
    status: 'IDLE',
    opponentMode: 'RANDOM',
    precision: 'normal',
    requestId: null,
    result: null,
    errorMessage: null,
  }
}
