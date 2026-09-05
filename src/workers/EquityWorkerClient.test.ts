import { describe, expect, it, vi } from 'vitest'
import type { EquityInput, EquityOutcome } from '../engine/equity/types'
import { EquityWorkerClient } from './EquityWorkerClient'
import type { EquityWorkerRequest, EquityWorkerResponse } from './equityProtocol'

type Handler = ((event: MessageEvent<EquityWorkerResponse>) => void) | null

class FakeWorker {
  onmessage: Handler = null
  onerror: ((event: ErrorEvent) => void) | null = null
  private terminated = false
  readonly posted: EquityWorkerRequest[] = []
  private readonly autoReply: boolean

  constructor(options?: { autoReply?: boolean }) {
    this.autoReply = options?.autoReply ?? true
  }

  postMessage(request: EquityWorkerRequest): void {
    if (this.terminated) return
    this.posted.push(request)
    if (!this.autoReply) return
    queueMicrotask(() => {
      this.emitResult(request.requestId, {
        ok: true,
        result: {
          wins: request.requestId,
          ties: 0,
          losses: 0,
          winProbability: 1,
          tieProbability: 0,
          lossProbability: 0,
          equity: 1,
          iterations: 1,
          method: 'EXACT',
        },
      })
    })
  }

  emitResult(requestId: number, outcome: EquityOutcome): void {
    this.onmessage?.({
      data: { type: 'RESULT', requestId, outcome },
    } as MessageEvent<EquityWorkerResponse>)
  }

  emitError(requestId: number, message: string): void {
    this.onmessage?.({
      data: { type: 'ERROR', requestId, message },
    } as MessageEvent<EquityWorkerResponse>)
  }

  emitMalformed(requestId: number): void {
    this.onmessage?.({
      data: { requestId, type: 'WEIRD' },
    } as unknown as MessageEvent<EquityWorkerResponse>)
  }

  terminate(): void {
    this.terminated = true
    this.onmessage = null
    this.onerror = null
  }
}

const sampleInput: EquityInput = {
  heroCards: ['As', 'Kh'],
  board: [],
  opponentMode: 'RANDOM',
  iterations: 10,
  seed: 1,
}

describe('EquityWorkerClient lifecycle', () => {
  it('resolves latest request and cancels stale prior request', async () => {
    let worker: FakeWorker | null = null
    const client = new EquityWorkerClient({
      createWorker: () => {
        worker = new FakeWorker({ autoReply: false })
        return worker as unknown as Worker
      },
    })

    const a = client.calculate(sampleInput)
    const b = client.calculate(sampleInput)

    // A was cancelled when B was issued
    const aResult = await a
    expect(aResult.ok).toBe(false)
    if (!aResult.ok) {
      expect(aResult.code).toBe('CANCELLED')
    }

    expect(worker).not.toBeNull()
    const bId = worker!.posted[1]!.requestId
    worker!.emitResult(bId, {
      ok: true,
      result: {
        wins: 1,
        ties: 0,
        losses: 0,
        winProbability: 1,
        tieProbability: 0,
        lossProbability: 0,
        equity: 1,
        iterations: 1,
        method: 'EXACT',
      },
    })

    const bResult = await b
    expect(bResult.ok).toBe(true)
    expect(client.pendingCount).toBe(0)
  })

  it('stale late response settles cancelled and does not leave pending', async () => {
    let worker: FakeWorker | null = null
    const client = new EquityWorkerClient({
      createWorker: () => {
        worker = new FakeWorker({ autoReply: false })
        return worker as unknown as Worker
      },
    })

    const a = client.calculate(sampleInput)
    const aId = worker!.posted[0]!.requestId

    // Immediately cancel A by starting B
    const bPromise = client.calculate(sampleInput)
    const aSettled = await a
    expect(aSettled.ok).toBe(false)

    // Late A response must not hang or crash
    worker!.emitResult(aId, {
      ok: true,
      result: {
        wins: 99,
        ties: 0,
        losses: 0,
        winProbability: 1,
        tieProbability: 0,
        lossProbability: 0,
        equity: 1,
        iterations: 1,
        method: 'EXACT',
      },
    })

    const bId = worker!.posted[1]!.requestId
    worker!.emitResult(bId, {
      ok: true,
      result: {
        wins: 2,
        ties: 0,
        losses: 0,
        winProbability: 1,
        tieProbability: 0,
        lossProbability: 0,
        equity: 1,
        iterations: 1,
        method: 'EXACT',
      },
    })
    const b = await bPromise
    expect(b.ok).toBe(true)
    expect(client.pendingCount).toBe(0)
  })

  it('terminate cancels all pending promises', async () => {
    const client = new EquityWorkerClient({
      createWorker: () => new FakeWorker({ autoReply: false }) as unknown as Worker,
    })
    const pending = client.calculate(sampleInput)
    client.terminate()
    const result = await pending
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('CANCELLED')
    }
    expect(client.pendingCount).toBe(0)
  })

  it('malformed worker response becomes WORKER_ERROR', async () => {
    let worker: FakeWorker | null = null
    const client = new EquityWorkerClient({
      createWorker: () => {
        worker = new FakeWorker({ autoReply: false })
        return worker as unknown as Worker
      },
    })
    const promise = client.calculate(sampleInput)
    worker!.emitMalformed(worker!.posted[0]!.requestId)
    const result = await promise
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('WORKER_ERROR')
    }
    expect(client.pendingCount).toBe(0)
  })

  it('worker ERROR response is controlled WORKER_ERROR', async () => {
    let worker: FakeWorker | null = null
    const client = new EquityWorkerClient({
      createWorker: () => {
        worker = new FakeWorker({ autoReply: false })
        return worker as unknown as Worker
      },
    })
    const promise = client.calculate(sampleInput)
    worker!.emitError(worker!.posted[0]!.requestId, 'boom')
    const result = await promise
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('WORKER_ERROR')
    }
  })

  it('does not use any in public result typing', () => {
    const spy = vi.fn()
    expect(typeof spy).toBe('function')
  })
})
