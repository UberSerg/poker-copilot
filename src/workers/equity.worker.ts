/// <reference lib="webworker" />
import { createEquityEngine } from '../engine/equity'
import type { EquityWorkerRequest, EquityWorkerResponse } from './equityProtocol'

const engine = createEquityEngine()

self.onmessage = (event: MessageEvent<EquityWorkerRequest>) => {
  const message = event.data
  if (!message || message.type !== 'CALCULATE') {
    return
  }

  try {
    const outcome = engine.calculate(message.input)
    const response: EquityWorkerResponse = {
      type: 'RESULT',
      requestId: message.requestId,
      outcome,
    }
    self.postMessage(response)
  } catch (error) {
    const response: EquityWorkerResponse = {
      type: 'ERROR',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Unknown equity worker error',
    }
    self.postMessage(response)
  }
}

export {}
