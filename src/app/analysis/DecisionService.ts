import type { AnalysisState } from '../analysis/AnalysisState'
import { getBoardCards, hasHeroCards, hasOpponentCards } from '../../domain/game/equitySelectors'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerState } from '../../domain/game/PokerState'
import { getHandMetrics } from '../../domain/game/selectors'
import type { EquityResult } from '../../engine/equity/types'
import {
  createDecisionEngine,
  type DecisionContext,
  type DecisionOpponentModel,
  type DecisionResult,
} from '../../engine/decision'
import { applyBlockers } from '../../engine/ranges/blockers'
import { formatRange } from '../../engine/ranges/formatter'

export type DecisionServiceOutcome =
  | { ok: true; result: DecisionResult }
  | { ok: false; code: DecisionUnavailableCode; message: string }

export type DecisionUnavailableCode =
  | 'MISSING_HERO'
  | 'MISSING_EQUITY'
  | 'INVALID_RANGE'
  | 'EMPTY_RANGE'
  | 'INCOMPLETE_OPPONENT'
  | 'ROUND_INACTIVE'

/**
 * Application-layer bridge: PokerState + AnalysisState + EquityResult → DecisionEngine.
 * Does not call EquityEngine itself.
 */
export function evaluateDecision(
  poker: PokerState,
  analysis: AnalysisState,
  equity: EquityResult | null,
): DecisionServiceOutcome {
  if (!hasHeroCards(poker)) {
    return {
      ok: false,
      code: 'MISSING_HERO',
      message: 'Недостаточно данных для рекомендации',
    }
  }
  if (!equity) {
    return {
      ok: false,
      code: 'MISSING_EQUITY',
      message: 'Недостаточно данных для рекомендации',
    }
  }
  if (analysis.opponentMode === 'RANGE') {
    if (analysis.rangeParseError) {
      return { ok: false, code: 'INVALID_RANGE', message: 'Ошибка диапазона соперника' }
    }
    if (analysis.range.size === 0) {
      return {
        ok: false,
        code: 'EMPTY_RANGE',
        message: 'Выберите диапазон соперника',
      }
    }
  }
  if (analysis.opponentMode === 'EXACT' && !hasOpponentCards(poker)) {
    return {
      ok: false,
      code: 'INCOMPLETE_OPPONENT',
      message: 'Укажите карты соперника или выберите другой режим',
    }
  }

  const metrics = getHandMetrics(poker)
  const legal = getLegalActions(poker, poker.heroPosition)
  if (legal.roundComplete && metrics.amountToCallChips === 0 && !legal.check && !legal.bet) {
    // Still allow evaluation for display when hero to act would be none — soft message
  }

  const board = getBoardCards(poker)
  const heroCards = [poker.heroCards[0]!, poker.heroCards[1]!] as const
  const opponentModel = buildOpponentModel(poker, analysis, heroCards, board)

  const context: DecisionContext = {
    pokerState: poker,
    heroCards,
    board,
    street: poker.street,
    position: poker.heroPosition,
    opponentModel,
    opponentMode: analysis.opponentMode,
    equity,
    potOdds: metrics.potOdds,
    requiredEquity: metrics.potOdds,
    amountToCall: metrics.amountToCallChips,
    spr: metrics.spr,
    effectiveStack: metrics.effectiveStackChips,
    potChips: metrics.potChips,
    legal,
  }

  const engine = createDecisionEngine()
  const started = performance.now()
  const result = engine.evaluate(context)
  const elapsed = performance.now() - started
  if (elapsed > 10) {
    // Soft signal only in metrics via warning — keep sync API
    result.warnings = [
      ...result.warnings,
      `Decision Engine занял ${elapsed.toFixed(1)} ms (ожидалось <10 ms)`,
    ]
  }

  return { ok: true, result }
}

function buildOpponentModel(
  poker: PokerState,
  analysis: AnalysisState,
  heroCards: readonly [import('../../domain/cards/Card').Card, import('../../domain/cards/Card').Card],
  board: readonly import('../../domain/cards/Card').Card[],
): DecisionOpponentModel {
  if (analysis.opponentMode === 'EXACT') {
    return {
      kind: 'EXACT',
      cards: [poker.opponentCards[0]!, poker.opponentCards[1]!],
    }
  }
  if (analysis.opponentMode === 'RANGE') {
    const available = applyBlockers(analysis.range, [...heroCards, ...board])
    return {
      kind: 'RANGE',
      label: formatRange(analysis.range) || 'диапазон',
      comboCount: available.size,
    }
  }
  return { kind: 'RANDOM' }
}
