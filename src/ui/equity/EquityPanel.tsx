import type { EquityResult } from '../../engine/equity/types'
import { MC_PRESETS } from '../../engine/equity/types'
import type { PrecisionPreset } from '../../app/equityUiState'
import type { RangeStats } from '../../engine/ranges/stats'
import type { OpponentMode } from '../../engine/equity/types'
import { ru } from '../../i18n/ru'
import './EquityPanel.css'

interface EquityPanelProps {
  status: 'IDLE' | 'CALCULATING' | 'SUCCESS' | 'ERROR'
  result: EquityResult | null
  errorMessage: string | null
  precision: PrecisionPreset
  onPrecisionChange: (precision: PrecisionPreset) => void
  blockedReason: string | null
  opponentMode: OpponentMode
  rangeStats: RangeStats | null
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatWeighted(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

export function EquityPanel({
  status,
  result,
  errorMessage,
  precision,
  onPrecisionChange,
  blockedReason,
  opponentMode,
  rangeStats,
}: EquityPanelProps) {
  const opponentLabel =
    opponentMode === 'RANGE' ? ru.equity.vsRangeOpponent : ru.equity.opponent

  return (
    <section className="equity-panel" aria-labelledby="equity-title">
      <h2 id="equity-title">
        {opponentMode === 'RANGE' ? ru.equity.vsRange : ru.equity.title}
      </h2>

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

      {opponentMode === 'RANGE' && rangeStats ? (
        <dl className="equity-range-context">
          <div>
            <dt>{ru.range.combos}</dt>
            <dd>{rangeStats.rawCombos}</dd>
          </div>
          <div>
            <dt>{ru.range.afterBlockers}</dt>
            <dd>{rangeStats.availableCombos}</dd>
          </div>
          <div>
            <dt>{ru.range.weighted}</dt>
            <dd>{formatWeighted(rangeStats.weightedAvailableCombos)}</dd>
          </div>
        </dl>
      ) : null}

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
            <dt>{opponentLabel}</dt>
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
            <dd>
              {result.method === 'EXACT' && opponentMode === 'RANGE'
                ? formatWeighted(result.iterations)
                : Math.round(result.iterations).toLocaleString('ru-RU')}
            </dd>
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
