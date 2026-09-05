import type { DecisionContext } from './DecisionContext'
import type { DecisionResult } from './DecisionResult'
import { evaluateFacingBet } from './rules/facingBetRules'
import { evaluateNoBet } from './rules/noBetRules'

export interface DecisionEngine {
  evaluate(context: DecisionContext): DecisionResult
}

export class RuleBasedDecisionEngine implements DecisionEngine {
  evaluate(context: DecisionContext): DecisionResult {
    if (context.amountToCall > 0) {
      return evaluateFacingBet(context)
    }
    return evaluateNoBet(context)
  }
}

export function createDecisionEngine(): DecisionEngine {
  return new RuleBasedDecisionEngine()
}
