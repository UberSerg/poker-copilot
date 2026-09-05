import type { Card } from '../../domain/cards/Card'
import type { OpponentMode } from '../../engine/equity/types'
import { formatEvaluatedHandRu } from '../../engine/hand-evaluator/formatRu'
import type { EvaluatedHand } from '../../engine/hand-evaluator/HandEvaluator'
import type { ShowdownResult } from '../../domain/game/equitySelectors'
import { ru } from '../../i18n/ru'
import { PlayingCard } from '../cards/PlayingCard'
import './OpponentPanel.css'

interface OpponentPanelProps {
  mode: OpponentMode
  cards: readonly [Card | null, Card | null]
  selectedSlot: string | null
  onModeChange: (mode: OpponentMode) => void
  onCardClick: (index: 0 | 1) => void
  heroHand: EvaluatedHand | null
  opponentHand: EvaluatedHand | null
  showdown: ShowdownResult
  heroComboLabel: string
}

export function OpponentPanel({
  mode,
  cards,
  selectedSlot,
  onModeChange,
  onCardClick,
  heroHand,
  opponentHand,
  showdown,
  heroComboLabel,
}: OpponentPanelProps) {
  return (
    <section className="opponent-panel" aria-labelledby="opponent-title">
      <h2 id="opponent-title">{ru.equity.opponentHand}</h2>

      <div className="opponent-mode">
        <label>
          <input
            type="radio"
            name="opp-mode"
            checked={mode === 'RANDOM'}
            onChange={() => onModeChange('RANDOM')}
          />
          {ru.equity.randomHand}
        </label>
        <label>
          <input
            type="radio"
            name="opp-mode"
            checked={mode === 'EXACT'}
            onChange={() => onModeChange('EXACT')}
          />
          {ru.equity.exactHand}
        </label>
        <label>
          <input
            type="radio"
            name="opp-mode"
            checked={mode === 'RANGE'}
            onChange={() => onModeChange('RANGE')}
          />
          {ru.equity.rangeHand}
        </label>
      </div>

      {mode === 'EXACT' ? (
        <div className="opponent-cards">
          {cards.map((card, index) => (
            <PlayingCard
              key={`opp-${index}`}
              card={card}
              selected={selectedSlot === `opp-${index}`}
              onClick={() => onCardClick(index as 0 | 1)}
              label={`${ru.equity.opponentHand} ${index + 1}`}
            />
          ))}
        </div>
      ) : mode === 'RANDOM' ? (
        <p className="opponent-random-hint">{ru.equity.randomHint}</p>
      ) : (
        <p className="opponent-random-hint">{ru.equity.rangeHint}</p>
      )}

      <div className="combo-block">
        <h3>{ru.equity.yourCombo}</h3>
        <p>{heroComboLabel}</p>
      </div>

      {showdown && heroHand && opponentHand && mode === 'EXACT' ? (
        <div className="showdown-block">
          <h3>{ru.equity.showdown}</h3>
          <p>
            {ru.equity.you}: {formatEvaluatedHandRu(heroHand)}
          </p>
          <p>
            {ru.equity.opponent}: {formatEvaluatedHandRu(opponentHand)}
          </p>
          <p className="showdown-result">
            {showdown === 'HERO'
              ? ru.equity.youWin
              : showdown === 'OPPONENT'
                ? ru.equity.opponentWins
                : ru.equity.tieResult}
          </p>
        </div>
      ) : null}
    </section>
  )
}
