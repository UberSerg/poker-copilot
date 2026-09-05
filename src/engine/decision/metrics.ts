import type { DecisionContext } from './DecisionContext'
import type { DecisionMetrics } from './DecisionResult'

export function buildDecisionMetrics(context: DecisionContext): DecisionMetrics {
  return {
    equity: context.equity.equity,
    requiredEquity: context.requiredEquity ?? undefined,
    potOdds: context.potOdds ?? undefined,
    spr: context.spr ?? undefined,
    effectiveStack: context.effectiveStack ?? undefined,
    amountToCall: context.amountToCall,
  }
}
