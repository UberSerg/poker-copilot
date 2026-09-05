import type { DecisionContext } from '../DecisionContext'
import type { DecisionResult } from '../DecisionResult'
import { confidenceFromEquityStrength } from '../confidence'
import { BET_EQUITY_THRESHOLD } from '../constants'
import {
  buildNoBetReasons,
  buildWarnings,
} from '../explanations/explanationBuilder'
import { buildDecisionMetrics } from '../metrics'
import { resolveBetSizing } from '../sizing/sizingRules'

/**
 * When amountToCall === 0: cautious value bet baseline, else CHECK.
 */
export function evaluateNoBet(context: DecisionContext): DecisionResult {
  const equity = context.equity.equity
  const metrics = buildDecisionMetrics(context)

  if (equity >= BET_EQUITY_THRESHOLD && context.legal.bet) {
    const sizing = resolveBetSizing(context)
    if (sizing) {
      const confidence = confidenceFromEquityStrength(equity, BET_EQUITY_THRESHOLD)
      return {
        action: 'BET',
        sizing,
        confidence,
        reasons: buildNoBetReasons('BET', equity),
        warnings: buildWarnings(context, confidence, 'BET'),
        metrics,
        modelLabel: 'RULE_BASED_V1',
      }
    }
  }

  const confidence = confidenceFromEquityStrength(equity, BET_EQUITY_THRESHOLD)
  const action = context.legal.check ? 'CHECK' : context.legal.fold ? 'FOLD' : 'CHECK'
  return {
    action,
    confidence,
    reasons: buildNoBetReasons('CHECK', equity),
    warnings: buildWarnings(context, confidence, 'CHECK'),
    metrics,
    modelLabel: 'RULE_BASED_V1',
  }
}
