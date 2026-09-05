export type DecisionAction = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE'

export type DecisionConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DecisionSizing {
  amountChips: number
  potFraction: number
  /** For RAISE: absolute raise-to total this street */
  raiseToChips?: number
}

export interface DecisionMetrics {
  equity?: number
  requiredEquity?: number
  potOdds?: number
  spr?: number
  effectiveStack?: number
  amountToCall?: number
}

export interface DecisionResult {
  action: DecisionAction
  sizing?: DecisionSizing
  confidence: DecisionConfidence
  reasons: string[]
  warnings: string[]
  metrics: DecisionMetrics
  /** Explicit: this is rule-based, not GTO */
  modelLabel: 'RULE_BASED_V1'
}
