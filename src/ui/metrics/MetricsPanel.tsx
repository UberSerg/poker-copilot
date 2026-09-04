import type { HandMetrics } from '../../domain/game/selectors'
import { formatBb } from '../../domain/math/chips'
import { ru } from '../../i18n/ru'
import './MetricsPanel.css'

interface MetricsPanelProps {
  metrics: HandMetrics
  bigBlind: number
}

export function MetricsPanel({ metrics, bigBlind }: MetricsPanelProps) {
  return (
    <section className="metrics-panel" aria-labelledby="metrics-title">
      <h2 id="metrics-title">{ru.panels.metrics}</h2>
      <dl>
        <div>
          <dt>{ru.labels.pot}</dt>
          <dd>{formatBb(metrics.potChips, bigBlind)} {ru.labels.bb}</dd>
        </div>
        <div>
          <dt>{ru.labels.toCall}</dt>
          <dd>
            {metrics.amountToCallChips > 0
              ? `${formatBb(metrics.amountToCallChips, bigBlind)} ${ru.labels.bb}`
              : ru.labels.dash}
          </dd>
        </div>
        <div>
          <dt>{ru.labels.potOdds}</dt>
          <dd>{metrics.potOddsLabel}</dd>
        </div>
        <div>
          <dt>{ru.labels.requiredEquity}</dt>
          <dd>{metrics.potOdds === null ? ru.labels.dash : metrics.potOddsLabel}</dd>
        </div>
        <div>
          <dt>{ru.labels.effectiveStack}</dt>
          <dd>
            {metrics.effectiveStackChips === null
              ? ru.labels.dash
              : `${formatBb(metrics.effectiveStackChips, bigBlind)} ${ru.labels.bb}`}
          </dd>
        </div>
        <div>
          <dt>{ru.labels.spr}</dt>
          <dd>{metrics.sprLabel === '—' ? ru.labels.dash : metrics.sprLabel}</dd>
        </div>
        <div>
          <dt>Equity</dt>
          <dd>{ru.labels.equitySoon}</dd>
        </div>
      </dl>
    </section>
  )
}
