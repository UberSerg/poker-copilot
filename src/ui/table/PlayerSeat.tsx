import { chipsToBb, formatBb } from '../../domain/math/chips'
import type { PlayerState } from '../../domain/game/PlayerState'
import type { Position } from '../../domain/game/Position'
import { ru } from '../../i18n/ru'
import './PlayerSeat.css'

interface PlayerSeatProps {
  player: PlayerState
  bigBlind: number
  isHero: boolean
  isActing: boolean
  onSelectHero: (position: Position) => void
  onStackChange: (position: Position, stackBb: number) => void
}

export function PlayerSeat({
  player,
  bigBlind,
  isHero,
  isActing,
  onSelectHero,
  onStackChange,
}: PlayerSeatProps) {
  const stackBb = chipsToBb(player.stackChips, bigBlind)
  const committedBb = chipsToBb(player.committedThisStreet, bigBlind)
  const status = player.folded
    ? ru.labels.statusFold
    : player.allIn
      ? ru.labels.statusAllIn
      : ru.labels.statusActive

  return (
    <div
      className={[
        'player-seat',
        isHero ? 'is-hero' : '',
        isActing ? 'is-acting' : '',
        player.folded ? 'is-folded' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="player-seat-top">
        <span className="player-seat-position">{player.position}</span>
        {player.position === 'BTN' ? <span className="dealer-button">{ru.labels.dealer}</span> : null}
        {isHero ? <span className="hero-badge">{ru.labels.you}</span> : null}
      </div>

      <div className="player-seat-stack">
        <label>
          {ru.labels.stack}
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            value={Number.isFinite(stackBb) ? stackBb : ''}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (!Number.isFinite(value) || value <= 0) {
                return
              }
              onStackChange(player.position, value)
            }}
          />
          <span>{ru.labels.bb}</span>
        </label>
      </div>

      <div className="player-seat-meta">
        <div>
          {ru.labels.inPot}: {formatBb(player.committedThisStreet, bigBlind)} {ru.labels.bb}
          {committedBb > 0 ? '' : ''}
        </div>
        <div>{status}</div>
      </div>

      {!isHero ? (
        <button type="button" className="set-hero-btn" onClick={() => onSelectHero(player.position)}>
          {ru.buttons.setHero}
        </button>
      ) : null}

      {isActing ? <div className="acting-tag">{ru.labels.acting}</div> : null}
    </div>
  )
}
