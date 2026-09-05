import type { DecisionConfidence, DecisionResult } from '../../engine/decision'
import { ru } from '../../i18n/ru'
import './RecommendationPanel.css'

export type RecommendationView =
  | { kind: 'RESULT'; result: DecisionResult }
  | { kind: 'UNAVAILABLE'; message: string }

interface RecommendationPanelProps {
  view: RecommendationView
}

function confidenceRu(c: DecisionConfidence): string {
  if (c === 'HIGH') return ru.decision.confidenceHigh
  if (c === 'MEDIUM') return ru.decision.confidenceMedium
  return ru.decision.confidenceLow
}

function actionRu(action: DecisionResult['action']): string {
  return ru.decision.actions[action]
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function RecommendationPanel({ view }: RecommendationPanelProps) {
  return (
    <section className="recommendation-panel" aria-labelledby="recommendation-title">
      <h2 id="recommendation-title">{ru.panels.recommendation}</h2>
      <p className="recommendation-disclaimer">{ru.decision.disclaimer}</p>

      {view.kind === 'UNAVAILABLE' ? (
        <p className="recommendation-unavailable">{view.message}</p>
      ) : (
        <>
          <div className="recommendation-action" data-action={view.result.action}>
            {actionRu(view.result.action)}
            {view.result.sizing ? (
              <span className="recommendation-sizing">
                {view.result.action === 'RAISE' && view.result.sizing.raiseToChips !== undefined
                  ? ` → ${view.result.sizing.raiseToChips}`
                  : view.result.action === 'BET'
                    ? ` ${view.result.sizing.amountChips} (${Math.round(view.result.sizing.potFraction * 100)}% pot)`
                    : null}
              </span>
            ) : null}
          </div>

          <p className="recommendation-confidence">
            {ru.decision.confidence}: <strong>{confidenceRu(view.result.confidence)}</strong>
          </p>

          <div className="recommendation-block">
            <h3>{ru.decision.why}</h3>
            <ul>
              {view.result.reasons.map((reason) => (
                <li key={reason}>✓ {reason}</li>
              ))}
            </ul>
          </div>

          <div className="recommendation-block">
            <h3>{ru.decision.metrics}</h3>
            <dl className="recommendation-metrics">
              {view.result.metrics.equity !== undefined ? (
                <div>
                  <dt>Equity</dt>
                  <dd>{pct(view.result.metrics.equity)}</dd>
                </div>
              ) : null}
              {view.result.metrics.requiredEquity !== undefined ? (
                <div>
                  <dt>{ru.decision.required}</dt>
                  <dd>{pct(view.result.metrics.requiredEquity)}</dd>
                </div>
              ) : null}
              {view.result.metrics.potOdds !== undefined ? (
                <div>
                  <dt>Pot Odds</dt>
                  <dd>{pct(view.result.metrics.potOdds)}</dd>
                </div>
              ) : null}
              {view.result.metrics.spr !== undefined ? (
                <div>
                  <dt>SPR</dt>
                  <dd>{view.result.metrics.spr.toFixed(1)}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          {view.result.warnings.length > 0 ? (
            <div className="recommendation-block recommendation-warnings">
              <h3>{ru.decision.warnings}</h3>
              <ul>
                {view.result.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
