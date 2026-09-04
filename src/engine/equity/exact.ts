import type { Card } from '../../domain/cards/Card'
import { compareHoleBoards } from '../hand-evaluator/pokerToolsStrength'
import {
  boardCompletions,
  combinationsCount,
  holeCombinations,
  remainingDeck,
} from './deckUtils'
import type { EquityInput, EquityOutcome, EquityResult } from './types'
import { MAX_EXACT_COMBINATIONS } from './types'

function emptyResult(method: EquityResult['method'], iterations: number, elapsedMs: number): EquityResult {
  return {
    wins: 0,
    ties: 0,
    losses: 0,
    winProbability: 0,
    tieProbability: 0,
    lossProbability: 0,
    equity: 0,
    iterations,
    method,
    elapsedMs,
  }
}

function finalize(
  wins: number,
  ties: number,
  losses: number,
  method: EquityResult['method'],
  started: number,
): EquityResult {
  const iterations = wins + ties + losses
  if (iterations === 0) {
    return emptyResult(method, 0, performance.now() - started)
  }
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
    method,
    elapsedMs: performance.now() - started,
  }
}

export function estimateExactCombinations(input: EquityInput): number {
  const known: Card[] = [...input.heroCards, ...input.board]
  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    known.push(...input.opponentCards)
  }
  const remaining = 52 - new Set(known).size
  const missingBoard = 5 - input.board.length
  const boardCombos = combinationsCount(remaining, missingBoard)

  if (input.opponentMode === 'EXACT') {
    return boardCombos
  }
  const oppCombos = combinationsCount(remaining, 2)
  const boardAfterOpp = combinationsCount(remaining - 2, missingBoard)
  return oppCombos * boardAfterOpp
}

export function shouldUseExactEnumeration(input: EquityInput): boolean {
  return estimateExactCombinations(input) <= MAX_EXACT_COMBINATIONS
}

export function calculateExact(input: EquityInput): EquityOutcome {
  const started = performance.now()
  const dead = new Set<Card>([...input.heroCards, ...input.board])
  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    for (const card of input.opponentCards) dead.add(card)
  }

  const remaining = remainingDeck(dead)
  const missingBoard = 5 - input.board.length
  let wins = 0
  let ties = 0
  let losses = 0

  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    const completions = boardCompletions(remaining, missingBoard)
    for (const extra of completions) {
      const board = [...input.board, ...extra]
      const cmp = compareHoleBoards(input.heroCards, input.opponentCards, board)
      if (cmp > 0) wins += 1
      else if (cmp < 0) losses += 1
      else ties += 1
    }
  } else {
    const oppCombos = holeCombinations(remaining)
    for (const opp of oppCombos) {
      const afterOpp = remaining.filter((card) => card !== opp[0] && card !== opp[1])
      const completions = boardCompletions(afterOpp, missingBoard)
      for (const extra of completions) {
        const board = [...input.board, ...extra]
        const cmp = compareHoleBoards(input.heroCards, opp, board)
        if (cmp > 0) wins += 1
        else if (cmp < 0) losses += 1
        else ties += 1
      }
    }
  }

  const iterations = wins + ties + losses
  if (iterations === 0) {
    return { ok: false, error: { code: 'NO_VALID_COMBINATIONS', message: 'No valid combinations' } }
  }

  return { ok: true, result: finalize(wins, ties, losses, 'EXACT', started) }
}
