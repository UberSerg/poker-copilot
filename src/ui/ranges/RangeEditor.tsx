import { ALL_HAND_CLASSES } from '../../engine/ranges/allHandClasses'
import { formatHandClass, type HandClass } from '../../engine/ranges/HandClass'
import { PokerRange } from '../../engine/ranges/Range'
import { computeRangeStats } from '../../engine/ranges/stats'
import type { Card } from '../../domain/cards/Card'
import { RangeMatrix } from './RangeMatrix'
import { ru } from '../../i18n/ru'
import './RangeEditor.css'

const WEIGHT_PRESETS = [1, 0.75, 0.5, 0.25] as const

export interface RangeEditorProps {
  range: PokerRange
  rangeText: string
  parseError: string | null
  knownCards: readonly Card[]
  selectedKey: string | null
  onTextChange: (text: string) => void
  onRangeChange: (range: PokerRange) => void
  onSelectHand: (hand: HandClass | null) => void
}

export function RangeEditor({
  range,
  rangeText,
  parseError,
  knownCards,
  selectedKey,
  onTextChange,
  onRangeChange,
  onSelectHand,
}: RangeEditorProps) {
  const stats = computeRangeStats(range, knownCards)
  const selectedHand =
    selectedKey === null
      ? null
      : ALL_HAND_CLASSES.find((h) => formatHandClass(h) === selectedKey) ?? null
  const selectedWeight = selectedHand
    ? (range.toHandClassWeights().get(formatHandClass(selectedHand)) ?? 0)
    : 0

  function toggleHand(hand: HandClass) {
    const key = formatHandClass(hand)
    const current = range.toHandClassWeights().get(key) ?? 0
    const next = current > 0 ? 0 : 1
    onRangeChange(range.withHandClassWeight(hand, next))
  }

  function applyWeight(weight: number) {
    if (!selectedHand) return
    onRangeChange(range.withHandClassWeight(selectedHand, weight))
  }

  function clearAll() {
    onRangeChange(PokerRange.empty())
    onSelectHand(null)
  }

  function selectAll() {
    const map = new Map<string, number>()
    for (const hand of ALL_HAND_CLASSES) {
      map.set(formatHandClass(hand), 1)
    }
    onRangeChange(PokerRange.fromHandClassWeights(map))
  }

  return (
    <section className="range-editor panel">
      <h2>{ru.range.title}</h2>
      <label className="range-editor__text-label">
        <span className="visually-hidden">{ru.range.textLabel}</span>
        <textarea
          className="range-editor__text"
          value={rangeText}
          onChange={(e) => onTextChange(e.target.value)}
          rows={2}
          spellCheck={false}
          placeholder="TT+, AQs+, AKo"
        />
      </label>
      {parseError ? (
        <p className="range-editor__error" role="alert">
          {ru.range.errorTitle}: {parseError}
        </p>
      ) : null}

      <div className="range-editor__actions">
        <button type="button" onClick={clearAll}>
          {ru.range.clear}
        </button>
        <button type="button" onClick={selectAll}>
          {ru.range.selectAll}
        </button>
      </div>

      <div className="range-editor__weights" aria-label={ru.range.weight}>
        <span>{ru.range.weight}:</span>
        {WEIGHT_PRESETS.map((w) => (
          <button
            key={w}
            type="button"
            className={
              selectedHand && Math.abs(selectedWeight - w) < 0.001
                ? 'is-active'
                : undefined
            }
            disabled={!selectedHand}
            onClick={() => applyWeight(w)}
          >
            {Math.round(w * 100)}%
          </button>
        ))}
      </div>

      <RangeMatrix
        range={range}
        selectedKey={selectedKey}
        onSelect={(hand) => onSelectHand(hand)}
        onToggle={toggleHand}
      />

      <dl className="range-editor__stats">
        <div>
          <dt>{ru.range.combos}</dt>
          <dd>{stats.rawCombos}</dd>
        </div>
        <div>
          <dt>{ru.range.afterBlockers}</dt>
          <dd>{stats.availableCombos}</dd>
        </div>
        <div>
          <dt>{ru.range.weighted}</dt>
          <dd>{formatWeighted(stats.weightedAvailableCombos)}</dd>
        </div>
      </dl>
    </section>
  )
}

function formatWeighted(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
