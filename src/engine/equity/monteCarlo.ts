import type { Card } from '../../domain/cards/Card'
import { compareHoleBoards } from '../hand-evaluator/pokerToolsStrength'
import { remainingDeck } from './deckUtils'
import { createSeededRandom, sampleWithoutReplacement, type Rng } from './rng'
import type { EquityInput, EquityOutcome } from './types'
import { MC_PRESETS } from './types'

function finalize(
  wins: number,
  ties: number,
  losses: number,
  iterations: number,
  started: number,
) {
  const winProbability = wins / iterations
  const tieProbability = ties / iterations
  const lossProbability = losses / iterations
  return {
    wins,
    ties,
    losses,
    winProbability,
    tieProbability,
    lossProbability,
    equity: winProbability + tieProbability / 2,
    iterations,
    method: 'MONTE_CARLO' as const,
    elapsedMs: performance.now() - started,
  }
}

export function calculateMonteCarlo(
  input: EquityInput,
  options?: { iterations?: number; seed?: number; rng?: Rng },
): EquityOutcome {
  const started = performance.now()
  const iterations = options?.iterations ?? input.iterations ?? MC_PRESETS.normal
  const rng =
    options?.rng ??
    createSeededRandom(options?.seed ?? input.seed ?? Date.now() % 1_000_000_000)

  const known: Card[] = [...input.heroCards, ...input.board]
  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    known.push(...input.opponentCards)
  }
  const baseDead = new Set(known)
  const baseRemaining = remainingDeck(baseDead)
  const missingBoard = 5 - input.board.length

  let wins = 0
  let ties = 0
  let losses = 0

  for (let i = 0; i < iterations; i += 1) {
    const need =
      input.opponentMode === 'EXACT' ? missingBoard : 2 + missingBoard
    const sampled =
      need === 0 ? [] : sampleWithoutReplacement(baseRemaining, need, rng)

    let opponent: readonly Card[]
    let boardExtra: Card[]
    if (input.opponentMode === 'EXACT' && input.opponentCards) {
      opponent = input.opponentCards
      boardExtra = sampled
    } else {
      opponent = [sampled[0]!, sampled[1]!]
      boardExtra = sampled.slice(2)
    }

    const board = [...input.board, ...boardExtra]
    const cmp = compareHoleBoards(input.heroCards, opponent, board)
    if (cmp > 0) wins += 1
    else if (cmp < 0) losses += 1
    else ties += 1
  }

  return { ok: true, result: finalize(wins, ties, losses, iterations, started) }
}
