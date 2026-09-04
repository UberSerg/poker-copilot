import type { EquityResult } from '../../engine/equity/types'
import { MC_PRESETS } from '../../engine/equity/types'
import type { PrecisionPreset } from '../../app/equityUiState'
import { ru } from '../../i18n/ru'
import './EquityPanel.css'

interface EquityPanelProps {
  status: 'IDLE' | 'CALCULATING' | 'SUCCESS' | 'ERROR'
  result: EquityResult | null
  errorMessage: string | null
  precision: PrecisionPreset
  onPrecisionChange: (precision: PrecisionPreset) => void
  blockedReason: string | null
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function EquityPanel({
  status,
  result,
  errorMessage,
  precision,
  onPrecisionChange,
  blockedReason,
}: EquityPanelProps) {
  return (
    <section className="equity-panel" aria-labelledby="equity-title">
      <h2 id="equity-title">{ru.equity.title}</h2>

      <label className="equity-precision">
        {ru.equity.precision}
        <select
          value={precision}
          onChange={(event) => onPrecisionChange(event.target.value as PrecisionPreset)}
        >
          <option value="fast">
            {ru.equity.fast} ({MC_PRESETS.fast.toLocaleString('ru-RU')})
          </option>
          <option value="normal">
            {ru.equity.normal} ({MC_PRESETS.normal.toLocaleString('ru-RU')})
          </option>
          <option value="high">
            {ru.equity.high} ({MC_PRESETS.high.toLocaleString('ru-RU')})
          </option>
        </select>
      </label>

      {blockedReason ? <p className="equity-blocked">{blockedReason}</p> : null}

      {status === 'CALCULATING' ? (
        <p className="equity-loading">
          <span className="equity-spinner" aria-hidden />
          {ru.equity.calculating}
        </p>
      ) : null}

      {status === 'ERROR' && errorMessage ? <p className="equity-error">{errorMessage}</p> : null}

      {status === 'SUCCESS' && result ? (
        <dl className="equity-stats">
          <div>
            <dt>{ru.equity.you}</dt>
            <dd>{pct(result.equity)}</dd>
          </div>
          <div>
            <dt>{ru.equity.opponent}</dt>
            <dd>{pct(1 - result.equity)}</dd>
          </div>
          <div>
            <dt>{ru.equity.win}</dt>
            <dd>{pct(result.winProbability)}</dd>
          </div>
          <div>
            <dt>{ru.equity.tie}</dt>
            <dd>{pct(result.tieProbability)}</dd>
          </div>
          <div>
            <dt>{ru.equity.lose}</dt>
            <dd>{pct(result.lossProbability)}</dd>
          </div>
          <div>
            <dt>{ru.equity.method}</dt>
            <dd>
              {result.method === 'EXACT' ? ru.equity.exact : ru.equity.monteCarlo}
            </dd>
          </div>
          <div>
            <dt>
              {result.method === 'EXACT' ? ru.equity.combinations : ru.equity.simulations}
            </dt>
            <dd>{result.iterations.toLocaleString('ru-RU')}</dd>
          </div>
          {result.elapsedMs !== undefined ? (
            <div>
              <dt>{ru.equity.time}</dt>
              <dd>{Math.round(result.elapsedMs)} ms</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {status === 'IDLE' && !blockedReason ? (
        <p className="equity-hint">{ru.equity.idleHint}</p>
      ) : null}
    </section>
  )
}
