import type { EquityInput, EquityOutcome } from '../engine/equity/types'
import type { EquityWorkerRequest, EquityWorkerResponse } from './equityProtocol'

export type EquityClientResult =
  | { ok: true; requestId: number; outcome: EquityOutcome }
  | { ok: false; requestId: number; message: string }

type Pending = {
  requestId: number
  resolve: (result: EquityClientResult) => void
}

/**
 * Equity worker client with monotonic requestId race protection.
 * Only the latest requestId resolves to callers that await; stale results are dropped.
 */
export class EquityWorkerClient {
  private worker: Worker | null = null
  private nextId = 1
  private latestId = 0
  private pending = new Map<number, Pending>()

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./equity.worker.ts', import.meta.url), {
        type: 'module',
      })
      this.worker.onmessage = (event: MessageEvent<EquityWorkerResponse>) => {
        this.handleResponse(event.data)
      }
      this.worker.onerror = () => {
        for (const [id, pending] of this.pending) {
          pending.resolve({
            ok: false,
            requestId: id,
            message: 'Не удалось выполнить расчёт equity.',
          })
        }
        this.pending.clear()
        this.terminate()
      }
    }
    return this.worker
  }

  private handleResponse(response: EquityWorkerResponse): void {
    const pending = this.pending.get(response.requestId)
    if (!pending) {
      return
    }
    this.pending.delete(response.requestId)

    // Stale: a newer request was issued
    if (response.requestId !== this.latestId) {
      return
    }

    if (response.type === 'ERROR') {
      pending.resolve({
        ok: false,
        requestId: response.requestId,
        message: 'Не удалось выполнить расчёт equity.',
      })
      return
    }

    pending.resolve({
      ok: true,
      requestId: response.requestId,
      outcome: response.outcome,
    })
  }

  calculate(input: EquityInput): Promise<EquityClientResult> {
    const requestId = this.nextId
    this.nextId += 1
    this.latestId = requestId

    const worker = this.ensureWorker()
    const request: EquityWorkerRequest = {
      type: 'CALCULATE',
      requestId,
      input,
    }

    return new Promise((resolve) => {
      this.pending.set(requestId, { requestId, resolve })
      worker.postMessage(request)
    })
  }

  terminate(): void {
    this.worker?.terminate()
    this.worker = null
    this.pending.clear()
  }
}
