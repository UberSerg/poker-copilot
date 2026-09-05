import { useMemo, useState } from 'react'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerAction } from '../../domain/game/PokerAction'
import type { PokerState } from '../../domain/game/PokerState'
import type { Position } from '../../domain/game/Position'
import { POSITIONS_6MAX } from '../../domain/game/Position'
import { chipsToBb } from '../../domain/math/chips'
import { bbToChips } from '../../domain/math/chips'
import { ru } from '../../i18n/ru'
import { actionButtonStyle, type ActionButtonArt } from '../theme/spriteMap'
import './ActionPanel.css'

interface ActionPanelProps {
  state: PokerState
  onAction: (action: PokerAction) => void
  onNewHand: () => void
  onUndo: () => void
  onNextStreet: () => void
  canUndo: boolean
  canAdvance: boolean
}

function SpriteActionButton({
  art,
  label,
  disabled,
  onClick,
  hint,
}: {
  art: ActionButtonArt
  label: string
  disabled?: boolean
  onClick: () => void
  hint?: string
}) {
  return (
    <div className="sprite-btn-wrap">
      <button
        type="button"
        className="sprite-btn sprite-btn--action"
        style={actionButtonStyle(art)}
        disabled={disabled}
        onClick={onClick}
        aria-label={label}
        title={label}
      >
        <span className="sprite-btn__label">{label}</span>
      </button>
      {hint ? <span className="sprite-btn-hint">{hint}</span> : null}
    </div>
  )
}

export function ActionPanel({
  state,
  onAction,
  onNewHand,
  onUndo,
  onNextStreet,
  canUndo,
  canAdvance,
}: ActionPanelProps) {
  const actor = state.actingPosition
  const [selected, setSelected] = useState<Position | null>(null)
  const position = selected ?? actor ?? state.heroPosition
  const legal = getLegalActions(state, position)
  const [sizeBb, setSizeBb] = useState('2.5')

  const sizeChips = useMemo(() => {
    const parsed = Number(sizeBb)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null
    }
    return bbToChips(parsed, state.bigBlind)
  }, [sizeBb, state.bigBlind])

  const maxBb = chipsToBb(legal.maxBetOrRaiseTo, state.bigBlind)

  function applyQuick(fraction: number | 'allin') {
    if (fraction === 'allin') {
      setSizeBb(String(maxBb))
      return
    }
    const amount = Math.round(state.pot * fraction)
    if (legal.bet) {
      setSizeBb(String(chipsToBb(Math.min(amount, legal.maxBetOrRaiseTo), state.bigBlind)))
      return
    }
    const raiseTo = Math.min(
      Math.max(state.minimumRaiseTo, state.currentBet + amount),
      legal.maxBetOrRaiseTo,
    )
    setSizeBb(String(chipsToBb(raiseTo, state.bigBlind)))
  }

  const callHint = legal.call
    ? `${chipsToBb(legal.amountToCall, state.bigBlind)} ${ru.labels.bb}`
    : undefined

  return (
    <section className="action-panel analysis-panel" aria-labelledby="actions-title">
      <h2 id="actions-title" className="analysis-panel__title">
        {ru.panels.actions}
      </h2>

      <label className="actor-select">
        Игрок
        <select
          value={position}
          onChange={(event) => setSelected(event.target.value as Position)}
        >
          {POSITIONS_6MAX.map((item) => (
            <option key={item} value={item}>
              {item}
              {state.actingPosition === item ? ` (${ru.labels.acting})` : ''}
            </option>
          ))}
        </select>
      </label>

      <div className="action-buttons">
        <SpriteActionButton
          art="fold"
          label={ru.buttons.fold}
          disabled={!legal.fold}
          onClick={() => onAction({ type: 'FOLD', position })}
        />
        <SpriteActionButton
          art="check"
          label={ru.buttons.check}
          disabled={!legal.check}
          onClick={() => onAction({ type: 'CHECK', position })}
        />
        <SpriteActionButton
          art="call"
          label={ru.buttons.call}
          disabled={!legal.call}
          onClick={() => onAction({ type: 'CALL', position })}
          hint={callHint}
        />
        <SpriteActionButton
          art="bet"
          label={ru.buttons.bet}
          disabled={!legal.bet || sizeChips === null}
          onClick={() => {
            if (sizeChips === null) return
            onAction({ type: 'BET', position, amountChips: sizeChips })
          }}
        />
        <SpriteActionButton
          art="raise"
          label={ru.buttons.raise}
          disabled={!legal.raise || sizeChips === null}
          onClick={() => {
            if (sizeChips === null) return
            onAction({ type: 'RAISE', position, raiseToChips: sizeChips })
          }}
        />
      </div>

      <label className="size-input">
        {legal.bet ? ru.labels.betSize : ru.labels.raiseTo} ({ru.labels.bb})
        <input value={sizeBb} onChange={(event) => setSizeBb(event.target.value)} />
      </label>

      <div className="quick-sizes">
        <button type="button" className="chip-btn" onClick={() => applyQuick(1 / 3)}>
          {ru.quickSizes.third}
        </button>
        <button type="button" className="chip-btn" onClick={() => applyQuick(1 / 2)}>
          {ru.quickSizes.half}
        </button>
        <button type="button" className="chip-btn" onClick={() => applyQuick(2 / 3)}>
          {ru.quickSizes.twoThirds}
        </button>
        <button type="button" className="chip-btn" onClick={() => applyQuick(3 / 4)}>
          {ru.quickSizes.threeQuarters}
        </button>
        <button type="button" className="chip-btn" onClick={() => applyQuick(1)}>
          {ru.quickSizes.pot}
        </button>
        <button type="button" className="chip-btn" onClick={() => applyQuick('allin')}>
          {ru.quickSizes.allIn}
        </button>
      </div>

      <div className="utility-buttons">
        <SpriteActionButton art="newHand" label={ru.buttons.newHand} onClick={onNewHand} />
        <SpriteActionButton
          art="undo"
          label={ru.buttons.undo}
          disabled={!canUndo}
          onClick={onUndo}
        />
        <SpriteActionButton
          art="nextStreet"
          label={ru.buttons.nextStreet}
          disabled={!canAdvance}
          onClick={onNextStreet}
        />
      </div>
    </section>
  )
}
