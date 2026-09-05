import type { EquityInput, EquityOutcome } from '../engine/equity/types'
import type { EquityWorkerRequest, EquityWorkerResponse } from './equityProtocol'

export type EquityClientErrorCode = 'CANCELLED' | 'WORKER_ERROR'

export type EquityClientResult =
  | { ok: true; requestId: number; outcome: EquityOutcome }
  | { ok: false; requestId: number; code: EquityClientErrorCode; message: string }

type Pending = {
  requestId: number
  resolve: (result: EquityClientResult) => void
}

export type EquityWorkerFactory = () => Worker

function defaultCreateWorker(): Worker {
  return new Worker(new URL('./equity.worker.ts', import.meta.url), {
    type: 'module',
  })
}

function isEquityWorkerResponse(value: unknown): value is EquityWorkerResponse {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (typeof record.requestId !== 'number') return false
  if (record.type === 'RESULT') return 'outcome' in record
  if (record.type === 'ERROR') return typeof record.message === 'string'
  return false
}

/**
 * Equity worker client with monotonic requestId race protection.
 * Every calculate() settles exactly once: success, CANCELLED, or WORKER_ERROR.
 */
export class EquityWorkerClient {
  private worker: Worker | null = null
  private nextId = 1
  private latestId = 0
  private pending = new Map<number, Pending>()
  private readonly createWorker: EquityWorkerFactory

  constructor(options?: { createWorker?: EquityWorkerFactory }) {
    this.createWorker = options?.createWorker ?? defaultCreateWorker
  }

  get pendingCount(): number {
    return this.pending.size
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = this.createWorker()
      this.worker.onmessage = (event: MessageEvent<unknown>) => {
        this.handleMessage(event.data)
      }
      this.worker.onerror = () => {
        this.rejectAllPending('WORKER_ERROR', 'Не удалось выполнить расчёт equity.')
        this.destroyWorkerOnly()
      }
    }
    return this.worker
  }

  private settle(pending: Pending, result: EquityClientResult): void {
    pending.resolve(result)
  }

  private cancelPending(pending: Pending, requestId: number): void {
    this.settle(pending, {
      ok: false,
      requestId,
      code: 'CANCELLED',
      message: 'Расчёт отменён',
    })
  }

  private rejectAllPending(code: EquityClientErrorCode, message: string): void {
    for (const [id, pending] of this.pending) {
      this.settle(pending, {
        ok: false,
        requestId: id,
        code,
        message,
      })
    }
    this.pending.clear()
  }

  private destroyWorkerOnly(): void {
    if (this.worker) {
      this.worker.onmessage = null
      this.worker.onerror = null
      this.worker.terminate()
      this.worker = null
    }
  }

  private handleMessage(data: unknown): void {
    if (!isEquityWorkerResponse(data)) {
      // Malformed: cancel matching pending if requestId present, else ignore.
      if (data && typeof data === 'object' && 'requestId' in data) {
        const requestId = (data as { requestId: unknown }).requestId
        if (typeof requestId === 'number') {
          const pending = this.pending.get(requestId)
          if (pending) {
            this.pending.delete(requestId)
            this.settle(pending, {
              ok: false,
              requestId,
              code: 'WORKER_ERROR',
              message: 'Не удалось выполнить расчёт equity.',
            })
          }
        }
      }
      return
    }

    this.handleResponse(data)
  }

  private handleResponse(response: EquityWorkerResponse): void {
    const pending = this.pending.get(response.requestId)
    if (!pending) {
      return
    }
    this.pending.delete(response.requestId)

    // Stale: a newer request was issued — settle as cancelled, do not update UI semantics.
    if (response.requestId !== this.latestId) {
      this.cancelPending(pending, response.requestId)
      return
    }

    if (response.type === 'ERROR') {
      this.settle(pending, {
        ok: false,
        requestId: response.requestId,
        code: 'WORKER_ERROR',
        message: 'Не удалось выполнить расчёт equity.',
      })
      return
    }

    this.settle(pending, {
      ok: true,
      requestId: response.requestId,
      outcome: response.outcome,
    })
  }

  calculate(input: EquityInput): Promise<EquityClientResult> {
    // Cancel prior in-flight requests that will become stale when this becomes latest.
    for (const [id, pending] of this.pending) {
      this.pending.delete(id)
      this.cancelPending(pending, id)
    }

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
    this.rejectAllPending('CANCELLED', 'Расчёт отменён')
    this.destroyWorkerOnly()
  }
}
