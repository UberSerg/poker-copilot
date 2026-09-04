import type { EquityInput, EquityOutcome } from '../engine/equity/types'

export type EquityWorkerRequest = {
  type: 'CALCULATE'
  requestId: number
  input: EquityInput
}

export type EquityWorkerSuccess = {
  type: 'RESULT'
  requestId: number
  outcome: EquityOutcome
}

export type EquityWorkerFailure = {
  type: 'ERROR'
  requestId: number
  message: string
}

export type EquityWorkerResponse = EquityWorkerSuccess | EquityWorkerFailure
