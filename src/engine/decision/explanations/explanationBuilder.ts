import type { DecisionContext } from '../DecisionContext'
import type { DecisionAction, DecisionConfidence, DecisionMetrics } from '../DecisionResult'

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function buildFacingBetReasons(
  action: DecisionAction,
  equity: number,
  required: number,
): string[] {
  const edge = equity - required
  const reasons: string[] = [
    `Equity ${pct(equity)}`,
    `Требуется ${pct(required)}`,
  ]
  if (action === 'FOLD') {
    reasons.push('Equity заметно ниже требуемого уровня относительно pot odds')
  } else if (action === 'CALL' || action === 'RAISE') {
    if (edge >= 0) {
      reasons.push(`Запас: +${pct(edge)}`)
      reasons.push('Размер ставки создаёт приемлемые pot odds для продолжения')
    } else {
      reasons.push('Equity близко к требуемому уровню')
    }
  }
  if (action === 'RAISE') {
    reasons.push('Сильное преимущество по equity — baseline для агрессии (не GTO)')
  }
  return reasons
}

export function buildNoBetReasons(action: DecisionAction, equity: number): string[] {
  const reasons = [`Equity ${pct(equity)}`]
  if (action === 'BET') {
    reasons.push('Rule-based value baseline: достаточное equity для ставки')
  } else {
    reasons.push('Недостаточно преимущества для агрессивного действия — модель предлагает CHECK')
  }
  return reasons
}

export function buildWarnings(
  context: DecisionContext,
  confidence: DecisionConfidence,
  action: DecisionAction,
): string[] {
  const warnings: string[] = []
  if (context.opponentMode === 'RANGE') {
    warnings.push('Диапазон соперника задан вручную')
  } else if (context.opponentMode === 'RANDOM') {
    warnings.push('Случайная рука соперника — грубое допущение, не стратегический range')
  }
  if (confidence === 'LOW') {
    warnings.push('Решение зависит от точности модели соперника')
  }
  if (action === 'BET' || action === 'RAISE') {
    warnings.push('Агрессия — упрощённый baseline, не оптимальная стратегия')
  }
  if (context.board.length < 3) {
    warnings.push('Preflop: rule-based модель особенно приблизительна')
  }
  return warnings
}

export function formatMetricsLines(metrics: DecisionMetrics): string[] {
  const lines: string[] = []
  if (metrics.equity !== undefined) lines.push(`Equity: ${pct(metrics.equity)}`)
  if (metrics.requiredEquity !== undefined) {
    lines.push(`Требуется: ${pct(metrics.requiredEquity)}`)
  }
  if (metrics.potOdds !== undefined) lines.push(`Pot Odds: ${pct(metrics.potOdds)}`)
  if (metrics.spr !== undefined) lines.push(`SPR: ${metrics.spr.toFixed(1)}`)
  return lines
}
