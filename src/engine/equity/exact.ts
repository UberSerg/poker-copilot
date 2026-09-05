import type { Card } from '../../domain/cards/Card'
import { compareHoleBoards } from '../hand-evaluator/pokerToolsStrength'
import {
  boardCompletions,
  combinationsCount,
  holeCombinations,
  remainingDeck,
} from './deckUtils'
import type { EquityInput, EquityOutcome, EquityResult } from './types'
import { MAX_EXACT_SCENARIOS } from './types'

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

function finalizeCounts(
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

function finalizeWeighted(
  weightedWins: number,
  weightedTies: number,
  weightedLosses: number,
  method: EquityResult['method'],
  started: number,
): EquityResult {
  const totalWeight = weightedWins + weightedTies + weightedLosses
  if (totalWeight <= 0) {
    return emptyResult(method, 0, performance.now() - started)
  }
  const winProbability = weightedWins / totalWeight
  const tieProbability = weightedTies / totalWeight
  const lossProbability = weightedLosses / totalWeight
  // Integer-ish counters for UI: round weighted totals for display iterations.
  return {
    wins: weightedWins,
    ties: weightedTies,
    losses: weightedLosses,
    winProbability,
    tieProbability,
    lossProbability,
    equity: winProbability + tieProbability / 2,
    iterations: totalWeight,
    method,
    elapsedMs: performance.now() - started,
  }
}

export function estimateExactScenarios(input: EquityInput): number {
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
  if (input.opponentMode === 'RANGE') {
    const combos = (input.rangeCombos ?? []).filter((c) => c.weight > 0)
    // Each combo removes 2 cards from the remaining deck for board enumeration.
    // Board count after removing a combo: combinationsCount(remaining - 2, missingBoard)
    // Using uniform remaining-2 estimate (all range combos are disjoint from known).
    const boardAfterOpp = combinationsCount(Math.max(0, remaining - 2), missingBoard)
    return combos.length * boardAfterOpp
  }
  const oppCombos = combinationsCount(remaining, 2)
  const boardAfterOpp = combinationsCount(remaining - 2, missingBoard)
  return oppCombos * boardAfterOpp
}

/** @deprecated use estimateExactScenarios */
export function estimateExactCombinations(input: EquityInput): number {
  return estimateExactScenarios(input)
}

export function shouldUseExactEnumeration(input: EquityInput): boolean {
  return estimateExactScenarios(input) <= MAX_EXACT_SCENARIOS
}

export function calculateExact(input: EquityInput): EquityOutcome {
  const started = performance.now()
  const dead = new Set<Card>([...input.heroCards, ...input.board])
  if (input.opponentMode === 'EXACT' && input.opponentCards) {
    for (const card of input.opponentCards) dead.add(card)
  }

  const remaining = remainingDeck(dead)
  const missingBoard = 5 - input.board.length

  if (input.opponentMode === 'RANGE') {
    const combos = (input.rangeCombos ?? []).filter((c) => c.weight > 0)
    if (combos.length === 0) {
      return {
        ok: false,
        error: {
          code: 'RANGE_EMPTY_AFTER_BLOCKERS',
          message: 'Range has no legal combos after blockers',
        },
      }
    }

    let weightedWins = 0
    let weightedTies = 0
    let weightedLosses = 0

    for (const combo of combos) {
      const afterOpp = remaining.filter(
        (card) => card !== combo.cards[0] && card !== combo.cards[1],
      )
      const completions = boardCompletions(afterOpp, missingBoard)
      if (completions.length === 0) continue
      // Each board completion is equally likely for this combo.
      const unit = combo.weight / completions.length
      for (const extra of completions) {
        const board = [...input.board, ...extra]
        const cmp = compareHoleBoards(input.heroCards, combo.cards, board)
        if (cmp > 0) weightedWins += unit
        else if (cmp < 0) weightedLosses += unit
        else weightedTies += unit
      }
    }

    const total = weightedWins + weightedTies + weightedLosses
    if (total <= 0) {
      return { ok: false, error: { code: 'NO_VALID_COMBINATIONS', message: 'No valid combinations' } }
    }
    return { ok: true, result: finalizeWeighted(weightedWins, weightedTies, weightedLosses, 'EXACT', started) }
  }

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

  return { ok: true, result: finalizeCounts(wins, ties, losses, 'EXACT', started) }
}
