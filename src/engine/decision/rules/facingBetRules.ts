import type { DecisionContext } from '../DecisionContext'
import type { DecisionResult } from '../DecisionResult'
import { confidenceFromGap } from '../confidence'
import { DECISION_SAFETY_MARGIN, RAISE_EQUITY_THRESHOLD } from '../constants'
import {
  buildFacingBetReasons,
  buildWarnings,
} from '../explanations/explanationBuilder'
import { buildDecisionMetrics } from '../metrics'
import { resolveRaiseSizing } from '../sizing/sizingRules'

export function evaluateFacingBet(context: DecisionContext): DecisionResult {
  const equity = context.equity.equity
  const required = context.requiredEquity ?? context.potOdds ?? 0
  const metrics = buildDecisionMetrics(context)
  const edge = equity - required

  // Clear fold
  if (edge < -DECISION_SAFETY_MARGIN) {
    const confidence = confidenceFromGap(equity, required)
    const action = context.legal.fold ? 'FOLD' : 'CALL'
    return {
      action,
      confidence,
      reasons: buildFacingBetReasons('FOLD', equity, required),
      warnings: buildWarnings(context, confidence, action),
      metrics,
      modelLabel: 'RULE_BASED_V1',
    }
  }

  // Strong value → raise baseline
  if (equity >= RAISE_EQUITY_THRESHOLD && context.legal.raise) {
    const sizing = resolveRaiseSizing(context)
    if (sizing) {
      const confidence = confidenceFromGap(equity, required)
      return {
        action: 'RAISE',
        sizing,
        confidence,
        reasons: buildFacingBetReasons('RAISE', equity, required),
        warnings: buildWarnings(context, confidence, 'RAISE'),
        metrics,
        modelLabel: 'RULE_BASED_V1',
      }
    }
  }

  // Call (clear or borderline)
  const confidence = confidenceFromGap(equity, required)
  const borderline = Math.abs(edge) <= DECISION_SAFETY_MARGIN
  const action = context.legal.call ? 'CALL' : context.legal.fold ? 'FOLD' : 'CHECK'
  const warnings = buildWarnings(
    context,
    borderline ? 'LOW' : confidence,
    action === 'CALL' ? 'CALL' : action,
  )
  if (borderline) {
    warnings.push('Пограничная ситуация: equity близко к требуемому')
  }

  return {
    action,
    confidence: borderline ? 'LOW' : confidence,
    reasons: buildFacingBetReasons(action === 'FOLD' ? 'FOLD' : 'CALL', equity, required),
    warnings,
    metrics,
    modelLabel: 'RULE_BASED_V1',
  }
}
