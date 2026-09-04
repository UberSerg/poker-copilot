import { FULL_DECK } from '../../domain/cards/deck'
import { formatCard, isRedSuit, RANKS, SUITS, type Card, createCard } from '../../domain/cards/Card'
import { ru } from '../../i18n/ru'
import './CardPicker.css'

interface CardPickerProps {
  used: ReadonlySet<Card>
  onPick: (card: Card) => void
  onClear: () => void
  onClose: () => void
  canClear: boolean
}

export function CardPicker({ used, onPick, onClear, onClose, canClear }: CardPickerProps) {
  return (
    <div className="card-picker" role="dialog" aria-label={ru.labels.pickCard}>
      <div className="card-picker-header">
        <strong>{ru.labels.pickCard}</strong>
        <button type="button" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="card-picker-grid">
        {RANKS.slice()
          .reverse()
          .map((rank) => (
            <div key={rank} className="card-picker-row">
              {SUITS.map((suit) => {
                const card = createCard(rank, suit)
                const disabled = used.has(card)
                return (
                  <button
                    key={card}
                    type="button"
                    className={[
                      'card-picker-cell',
                      isRedSuit(suit) ? 'is-red' : 'is-black',
                      disabled ? 'is-used' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={disabled}
                    onClick={() => onPick(card)}
                    title={formatCard(card)}
                  >
                    {formatCard(card)}
                  </button>
                )
              })}
            </div>
          ))}
      </div>
      <div className="card-picker-footer">
        <button type="button" disabled={!canClear} onClick={onClear}>
          {ru.labels.clear}
        </button>
        <p className="card-picker-hint">Всего карт: {FULL_DECK.length}</p>
      </div>
    </div>
  )
}
