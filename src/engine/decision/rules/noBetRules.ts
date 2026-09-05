import type { DecisionContext } from '../DecisionContext'
import type { DecisionResult } from '../DecisionResult'
import { calculateConfidence } from '../confidence'
import { BET_EQUITY_THRESHOLD } from '../constants'
import {
  buildExplanationSections,
  buildIntelligenceWarnings,
  createAudit,
  flattenReasons,
} from '../explanations/explanationBuilder'
import { buildDecisionMetrics } from '../metrics'
import { resolveBetSizing } from '../sizing/sizingRules'

export function evaluateNoBet(context: DecisionContext): DecisionResult {
  const equity = context.equity.equity
  const metrics = buildDecisionMetrics(context)
  const rulesChecked = ['BET_VALUE_BASELINE', 'CHECK_DEFAULT', 'BOARD_TEXTURE']
  const rangeComboCount =
    context.opponentModel.kind === 'RANGE' ? context.opponentModel.comboCount : undefined
  const confBase = {
    equity,
    required: null as number | null,
    opponentMode: context.opponentMode,
    street: context.street,
    rangeComboCount,
    handStrength: context.handContext.strengthClass,
  }

  if (equity >= BET_EQUITY_THRESHOLD && context.legal.bet) {
    const sizing = resolveBetSizing(context)
    if (sizing) {
      const confidence = calculateConfidence(confBase)
      const sections = buildExplanationSections(context, 'BET', metrics)
      const triggered = ['BET_VALUE_BASELINE']
      if (context.boardTexture.texture === 'DRY') triggered.push('DRY_BOARD_CONTEXT')
      if (context.boardTexture.texture === 'WET') triggered.push('WET_BOARD_WARNING')
      return {
        action: 'BET',
        sizing,
        confidence,
        reasons: flattenReasons(sections),
        warnings: buildIntelligenceWarnings(context, confidence, 'BET', false),
        metrics,
        explanationSections: sections,
        audit: createAudit(context, 'BET', rulesChecked, triggered),
        modelLabel: 'RULE_BASED_V1',
      }
    }
  }

  const confidence = calculateConfidence(confBase)
  const action = context.legal.check ? 'CHECK' : context.legal.fold ? 'FOLD' : 'CHECK'
  const sections = buildExplanationSections(context, 'CHECK', metrics)
  return {
    action,
    confidence,
    reasons: flattenReasons(sections),
    warnings: buildIntelligenceWarnings(context, confidence, 'CHECK', false),
    metrics,
    explanationSections: sections,
    audit: createAudit(context, action, rulesChecked, ['CHECK_DEFAULT']),
    modelLabel: 'RULE_BASED_V1',
  }
}
