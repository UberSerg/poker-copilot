import type { Card } from '../../domain/cards/Card'
import type { PokerState } from '../../domain/game/PokerState'
import {
  getBoardCards,
  getBoardShape,
  hasHeroCards,
  hasOpponentCards,
} from '../../domain/game/equitySelectors'
import type { EquityInput } from '../../engine/equity/types'
import { applyBlockers } from '../../engine/ranges/blockers'
import { computeRangeStats, type RangeStats } from '../../engine/ranges/stats'
import type { AnalysisState } from './AnalysisState'

export type BuildEquityResult =
  | { ok: true; input: EquityInput; rangeStats?: RangeStats }
  | { ok: false; reason: string; code?: string }

export function buildAnalysisEquityInput(
  poker: PokerState,
  analysis: AnalysisState,
  iterations: number,
  seed?: number,
): BuildEquityResult {
  if (!hasHeroCards(poker)) {
    return { ok: false, reason: 'Выберите две карты Hero', code: 'MISSING_HERO' }
  }
  const shape = getBoardShape(poker)
  if (shape === 'INVALID') {
    return {
      ok: false,
      reason: 'Для расчёта завершите флоп (3 карты борда)',
      code: 'INVALID_BOARD',
    }
  }

  const heroCards: [Card, Card] = [poker.heroCards[0]!, poker.heroCards[1]!]
  const board = getBoardCards(poker)

  if (analysis.opponentMode === 'EXACT') {
    if (!hasOpponentCards(poker)) {
      return {
        ok: false,
        reason: 'Укажите две карты соперника или выберите другой режим',
        code: 'INCOMPLETE_OPPONENT',
      }
    }
    return {
      ok: true,
      input: {
        heroCards,
        board,
        opponentMode: 'EXACT',
        opponentCards: [poker.opponentCards[0]!, poker.opponentCards[1]!],
        iterations,
        seed,
      },
    }
  }

  if (analysis.opponentMode === 'RANDOM') {
    return {
      ok: true,
      input: {
        heroCards,
        board,
        opponentMode: 'RANDOM',
        iterations,
        seed,
      },
    }
  }

  // RANGE
  if (analysis.rangeParseError) {
    return { ok: false, reason: analysis.rangeParseError, code: 'RANGE_PARSE' }
  }
  if (analysis.range.size === 0) {
    return { ok: false, reason: 'Диапазон пуст', code: 'RANGE_EMPTY' }
  }

  const known = [...heroCards, ...board]
  const available = applyBlockers(analysis.range, known)
  const stats = computeRangeStats(analysis.range, known)
  if (available.size === 0) {
    return {
      ok: false,
      reason:
        'После учёта известных карт в диапазоне соперника не осталось комбинаций.',
      code: 'RANGE_EMPTY_AFTER_BLOCKERS',
    }
  }

  return {
    ok: true,
    input: {
      heroCards,
      board,
      opponentMode: 'RANGE',
      rangeCombos: available.toCombos(),
      iterations,
      seed,
    },
    rangeStats: stats,
  }
}
