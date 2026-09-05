import type { DecisionContext } from '../DecisionContext'
import type {
  DecisionAction,
  DecisionAudit,
  DecisionConfidence,
  DecisionMetrics,
  ExplanationSection,
} from '../DecisionResult'

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function buildExplanationSections(
  context: DecisionContext,
  action: DecisionAction,
  metrics: DecisionMetrics,
): ExplanationSection[] {
  const mathItems: string[] = []
  if (metrics.equity !== undefined) mathItems.push(`Equity ${pct(metrics.equity)}`)
  if (metrics.requiredEquity !== undefined) {
    mathItems.push(`Требуется ${pct(metrics.requiredEquity)}`)
    if (metrics.equity !== undefined) {
      const edge = metrics.equity - metrics.requiredEquity
      mathItems.push(
        edge >= 0
          ? `Equity выше требуемого уровня (запас +${pct(edge)})`
          : `Equity ниже требуемого уровня (${pct(edge)})`,
      )
    }
  } else if (metrics.potOdds !== undefined) {
    mathItems.push(`Pot Odds ${pct(metrics.potOdds)}`)
  }
  if (metrics.spr !== undefined) mathItems.push(`SPR ${metrics.spr.toFixed(1)}`)

  const contextItems = [
    ...context.handContext.description,
    ...context.boardTexture.description.slice(0, 2),
  ]
  if (context.amountToCall > 0) {
    contextItems.push(...context.betContext.description.slice(0, 1))
  }
  contextItems.push(...context.positionContext.description)

  if (action === 'BET') {
    contextItems.push('Rule-based value baseline')
  }
  if (action === 'RAISE') {
    contextItems.push('Сильное equity-преимущество — baseline для агрессии')
  }

  return [
    { title: 'Математика', items: mathItems },
    { title: 'Контекст', items: contextItems },
  ]
}

export function flattenReasons(sections: ExplanationSection[]): string[] {
  return sections.flatMap((s) => s.items)
}

export function buildIntelligenceWarnings(
  context: DecisionContext,
  confidence: DecisionConfidence,
  action: DecisionAction,
  borderline: boolean,
): string[] {
  const warnings: string[] = []
  if (context.opponentMode === 'RANGE') {
    warnings.push('Решение зависит от заданного диапазона соперника')
  } else if (context.opponentMode === 'RANDOM') {
    warnings.push('Случайная рука соперника — грубое допущение')
  }
  if (confidence === 'LOW' || borderline) {
    warnings.push('Решение зависит от точности модели соперника')
  }
  if (action === 'BET' || action === 'RAISE') {
    warnings.push('Агрессия — упрощённый baseline, не оптимальная стратегия')
  }
  if (action === 'RAISE') {
    warnings.push(
      'Value context ограничен: нет модели реакции соперника',
    )
  }
  if (context.boardTexture.texture === 'WET' && (action === 'BET' || action === 'CALL')) {
    warnings.push('Board содержит много возможных улучшений')
  }
  if (context.street === 'PREFLOP') {
    warnings.push('Preflop: rule-based модель особенно приблизительна')
  }
  return warnings
}

export function createAudit(
  context: DecisionContext,
  action: DecisionAction,
  rulesChecked: string[],
  rulesTriggered: string[],
): DecisionAudit {
  return {
    rulesChecked,
    rulesTriggered,
    inputs: {
      equity: context.equity.equity,
      potOdds: context.potOdds,
      spr: context.spr,
    },
    context: {
      boardTexture: context.boardTexture.texture,
      handContext: context.handContext.description,
      betSize: context.amountToCall > 0 ? context.betContext.size : undefined,
      position: context.positionContext.category,
    },
    finalAction: action,
  }
}

/** Legacy helpers kept for older imports */
export function buildFacingBetReasons(
  action: DecisionAction,
  equity: number,
  required: number,
): string[] {
  return buildExplanationSections(
    {
      equity: { equity } as DecisionContext['equity'],
      handContext: { description: [] },
      boardTexture: { description: [], texture: 'DRY' },
      betContext: { description: [] },
      positionContext: { description: [] },
      amountToCall: 1,
      street: 'FLOP',
    } as unknown as DecisionContext,
    action,
    { equity, requiredEquity: required },
  ).flatMap((s) => s.items)
}

export function buildNoBetReasons(action: DecisionAction, equity: number): string[] {
  return [`Equity ${pct(equity)}`, action === 'BET' ? 'Rule-based value baseline' : 'CHECK baseline']
}

export function buildWarnings(
  context: DecisionContext,
  confidence: DecisionConfidence,
  action: DecisionAction,
): string[] {
  return buildIntelligenceWarnings(context, confidence, action, false)
}
