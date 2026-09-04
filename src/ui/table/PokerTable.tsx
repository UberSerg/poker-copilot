import type { Card } from '../../domain/cards/Card'
import type { PokerState } from '../../domain/game/PokerState'
import type { Position } from '../../domain/game/Position'
import { formatChipsAsBb } from '../../domain/game/selectors'
import { ru } from '../../i18n/ru'
import { PlayingCard } from '../cards/PlayingCard'
import { PlayerSeat } from './PlayerSeat'
import './PokerTable.css'

const SEAT_CLASS: Record<Position, string> = {
  UTG: 'seat-utg',
  HJ: 'seat-hj',
  CO: 'seat-co',
  BTN: 'seat-btn',
  SB: 'seat-sb',
  BB: 'seat-bb',
}

interface PokerTableProps {
  state: PokerState
  onSelectHero: (position: Position) => void
  onStackChange: (position: Position, stackBb: number) => void
  onHeroCardClick: (index: 0 | 1) => void
  onBoardCardClick: (index: 0 | 1 | 2 | 3 | 4) => void
  selectedSlot: string | null
}

export function PokerTable({
  state,
  onSelectHero,
  onStackChange,
  onHeroCardClick,
  onBoardCardClick,
  selectedSlot,
}: PokerTableProps) {
  return (
    <section className="poker-table-wrap" aria-label={ru.panels.table}>
      <div className="poker-table">
        {(Object.keys(SEAT_CLASS) as Position[]).map((position) => (
          <div key={position} className={`seat-anchor ${SEAT_CLASS[position]}`}>
            <PlayerSeat
              player={state.players[position]}
              bigBlind={state.bigBlind}
              isHero={state.heroPosition === position}
              isActing={state.actingPosition === position}
              onSelectHero={onSelectHero}
              onStackChange={onStackChange}
            />
          </div>
        ))}

        <div className="table-center">
          <div className="table-pot">
            {ru.labels.pot}: {formatChipsAsBb(state.pot, state.bigBlind)}
          </div>
          <div className="board-row" aria-label={ru.panels.board}>
            {state.board.map((card, index) => (
              <PlayingCard
                key={`board-${index}`}
                card={card}
                selected={selectedSlot === `board-${index}`}
                onClick={() => onBoardCardClick(index as 0 | 1 | 2 | 3 | 4)}
                label={`${ru.panels.board} ${index + 1}`}
              />
            ))}
          </div>
          <div className="street-label">{ru.streets[state.street]}</div>
        </div>
      </div>

      <div className="hero-cards-panel">
        <h3>{ru.panels.heroCards}</h3>
        <div className="hero-cards-row">
          {state.heroCards.map((card: Card | null, index) => (
            <PlayingCard
              key={`hero-${index}`}
              card={card}
              large
              selected={selectedSlot === `hero-${index}`}
              onClick={() => onHeroCardClick(index as 0 | 1)}
              label={`${ru.panels.heroCards} ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
