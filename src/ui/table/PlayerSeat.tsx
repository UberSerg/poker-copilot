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
  setupEditable: boolean
  onSelectHero: (position: Position) => void
  onStartingStackChange: (position: Position, startingStackBb: number) => void
}

export function PlayerSeat({
  player,
  bigBlind,
  isHero,
  isActing,
  setupEditable,
  onSelectHero,
  onStartingStackChange,
}: PlayerSeatProps) {
  const behindBb = chipsToBb(player.stackChips, bigBlind)
  const startingBb = chipsToBb(player.startingStackChips, bigBlind)
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
          {ru.labels.startingStack}
          <input
            type="number"
            min={1}
            max={1000}
            step={1}
            disabled={!setupEditable}
            value={Number.isFinite(startingBb) ? startingBb : ''}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (!Number.isFinite(value) || value <= 0) {
                return
              }
              onStartingStackChange(player.position, value)
            }}
          />
          <span>{ru.labels.bb}</span>
        </label>
        <div className="behind-stack">
          {ru.labels.stack}: {formatBb(player.stackChips, bigBlind)} {ru.labels.bb}
        </div>
      </div>

      <div className="player-seat-meta">
        <div>
          {ru.labels.inPot}: {formatBb(player.committedThisStreet, bigBlind)} {ru.labels.bb}
        </div>
        <div>{status}</div>
        <div className="behind-hint">
          {ru.labels.behind}: {behindBb} {ru.labels.bb}
        </div>
      </div>

      {!isHero ? (
        <button
          type="button"
          className="set-hero-btn"
          disabled={!setupEditable}
          onClick={() => onSelectHero(player.position)}
        >
          {ru.buttons.setHero}
        </button>
      ) : null}

      {isActing ? <div className="acting-tag">{ru.labels.acting}</div> : null}
    </div>
  )
}
