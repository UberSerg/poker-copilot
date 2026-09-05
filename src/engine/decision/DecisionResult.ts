export type DecisionAction = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE'

export type DecisionConfidence = 'LOW' | 'MEDIUM' | 'HIGH'

export interface DecisionSizing {
  amountChips: number
  potFraction: number
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

export interface ExplanationSection {
  title: string
  items: string[]
}

export interface DecisionAudit {
  rulesChecked: string[]
  rulesTriggered: string[]
  inputs: {
    equity: number
    potOdds: number | null
    spr: number | null
  }
  context: {
    boardTexture: string
    handContext: string[]
    betSize?: string
    position?: string
  }
  finalAction: string
}

export interface DecisionResult {
  action: DecisionAction
  sizing?: DecisionSizing
  confidence: DecisionConfidence
  /** Flat reasons for backward compatibility */
  reasons: string[]
  warnings: string[]
  metrics: DecisionMetrics
  explanationSections: ExplanationSection[]
  audit: DecisionAudit
  modelLabel: 'RULE_BASED_V1'
}
