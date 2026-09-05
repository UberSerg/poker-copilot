import type { AnalysisState } from './AnalysisState'
import { getBoardCards, hasHeroCards, hasOpponentCards } from '../../domain/game/equitySelectors'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerState } from '../../domain/game/PokerState'
import { getHandMetrics } from '../../domain/game/selectors'
import {
  analyzeBetContext,
  analyzeBoardTexture,
  analyzeHandContext,
  analyzePositionContext,
} from '../../engine/analysis'
import {
  createDecisionEngine,
  type DecisionContext,
  type DecisionOpponentModel,
  type DecisionResult,
} from '../../engine/decision'
import type { EquityResult } from '../../engine/equity/types'
import { applyBlockers } from '../../engine/ranges/blockers'
import { formatRange } from '../../engine/ranges/formatter'
import type { Card } from '../../domain/cards/Card'

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
  const board = getBoardCards(poker)
  const heroCards: [Card, Card] = [poker.heroCards[0]!, poker.heroCards[1]!]
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
    boardTexture: analyzeBoardTexture(board),
    handContext: analyzeHandContext(heroCards, board),
    positionContext: analyzePositionContext(poker.heroPosition),
    betContext: analyzeBetContext(metrics.potChips, metrics.amountToCallChips),
  }

  const engine = createDecisionEngine()
  const started = performance.now()
  const result = engine.evaluate(context)
  const elapsed = performance.now() - started
  if (elapsed > 20) {
    result.warnings = [
      ...result.warnings,
      `Decision Engine занял ${elapsed.toFixed(1)} ms (цель <20 ms)`,
    ]
  }

  return { ok: true, result }
}

function buildOpponentModel(
  poker: PokerState,
  analysis: AnalysisState,
  heroCards: readonly [Card, Card],
  board: readonly Card[],
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
