import type { DecisionContext } from '../DecisionContext'
import type { DecisionResult } from '../DecisionResult'
import { calculateConfidence } from '../confidence'
import { DECISION_SAFETY_MARGIN, RAISE_EQUITY_THRESHOLD } from '../constants'
import {
  buildExplanationSections,
  buildIntelligenceWarnings,
  createAudit,
  flattenReasons,
} from '../explanations/explanationBuilder'
import { buildDecisionMetrics } from '../metrics'
import { resolveRaiseSizing } from '../sizing/sizingRules'

export function evaluateFacingBet(context: DecisionContext): DecisionResult {
  const equity = context.equity.equity
  const required = context.requiredEquity ?? context.potOdds ?? 0
  const metrics = buildDecisionMetrics(context)
  const edge = equity - required
  const rulesChecked = [
    'FOLD_EQUITY_DISADVANTAGE',
    'CALL_EQUITY_ADVANTAGE',
    'RAISE_STRONG_EQUITY',
    'HAND_STRENGTH_CONTEXT',
    'BET_SIZE_CONTEXT',
  ]
  const rangeComboCount =
    context.opponentModel.kind === 'RANGE' ? context.opponentModel.comboCount : undefined

  const confBase = {
    equity,
    required,
    opponentMode: context.opponentMode,
    street: context.street,
    rangeComboCount,
    handStrength: context.handContext.strengthClass,
  }

  // Clear fold: weak equity and weak hand
  if (
    edge < -DECISION_SAFETY_MARGIN &&
    (context.handContext.strengthClass === 'WEAK' || edge < -DECISION_SAFETY_MARGIN * 2)
  ) {
    const action = context.legal.fold ? 'FOLD' : 'CALL'
    const confidence = calculateConfidence(confBase)
    const sections = buildExplanationSections(context, 'FOLD', metrics)
    const warnings = buildIntelligenceWarnings(context, confidence, action, false)
    const triggered = ['FOLD_EQUITY_DISADVANTAGE', 'HAND_STRENGTH_CONTEXT']
    return {
      action,
      confidence,
      reasons: flattenReasons(sections),
      warnings,
      metrics,
      explanationSections: sections,
      audit: createAudit(context, action, rulesChecked, triggered),
      modelLabel: 'RULE_BASED_V1',
    }
  }

  if (edge < -DECISION_SAFETY_MARGIN) {
    const action = context.legal.fold ? 'FOLD' : 'CALL'
    const confidence = calculateConfidence(confBase)
    const sections = buildExplanationSections(context, 'FOLD', metrics)
    return {
      action,
      confidence,
      reasons: flattenReasons(sections),
      warnings: buildIntelligenceWarnings(context, confidence, action, false),
      metrics,
      explanationSections: sections,
      audit: createAudit(context, action, rulesChecked, ['FOLD_EQUITY_DISADVANTAGE']),
      modelLabel: 'RULE_BASED_V1',
    }
  }

  // Strong value → raise
  if (equity >= RAISE_EQUITY_THRESHOLD && context.legal.raise) {
    const sizing = resolveRaiseSizing(context)
    if (sizing) {
      const confidence = calculateConfidence(confBase)
      const sections = buildExplanationSections(context, 'RAISE', metrics)
      const triggered = ['RAISE_STRONG_EQUITY', 'CALL_EQUITY_ADVANTAGE']
      if (context.handContext.pairContext === 'TOP_PAIR' || context.handContext.pairContext === 'OVERPAIR') {
        triggered.push('TOP_PAIR_CONTEXT')
      }
      return {
        action: 'RAISE',
        sizing,
        confidence,
        reasons: flattenReasons(sections),
        warnings: buildIntelligenceWarnings(context, confidence, 'RAISE', false),
        metrics,
        explanationSections: sections,
        audit: createAudit(context, 'RAISE', rulesChecked, triggered),
        modelLabel: 'RULE_BASED_V1',
      }
    }
  }

  const borderline = Math.abs(edge) <= DECISION_SAFETY_MARGIN
  const action = context.legal.call ? 'CALL' : context.legal.fold ? 'FOLD' : 'CHECK'
  const confidence = borderline ? 'LOW' : calculateConfidence(confBase)
  const sections = buildExplanationSections(context, action === 'FOLD' ? 'FOLD' : 'CALL', metrics)
  const triggered = ['CALL_EQUITY_ADVANTAGE']
  if (context.handContext.pairContext === 'TOP_PAIR') triggered.push('TOP_PAIR_CONTEXT')
  if (context.betContext.size === 'SMALL' || context.betContext.size === 'MEDIUM') {
    triggered.push('BET_SIZE_CONTEXT')
  }
  if (borderline) triggered.push('BORDERLINE_EQUITY')

  return {
    action,
    confidence,
    reasons: flattenReasons(sections),
    warnings: buildIntelligenceWarnings(context, confidence, action, borderline),
    metrics,
    explanationSections: sections,
    audit: createAudit(context, action, rulesChecked, triggered),
    modelLabel: 'RULE_BASED_V1',
  }
}
