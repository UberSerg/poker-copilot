import { useMemo, useState } from 'react'
import { getLegalActions } from '../../domain/game/legalActions'
import type { PokerAction } from '../../domain/game/PokerAction'
import type { PokerState } from '../../domain/game/PokerState'
import type { Position } from '../../domain/game/Position'
import { POSITIONS_6MAX } from '../../domain/game/Position'
import { chipsToBb } from '../../domain/math/chips'
import { bbToChips } from '../../domain/math/chips'
import { ru } from '../../i18n/ru'
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
    // raise-to = current committed of actor is 0 postflop typically; raise-to = currentBet + size? 
    // Quick sizes for raise: treat as raise-to = current street contribution target ≈ potFraction of pot added on top of call,
    // Spec: quick sizes calculate input amount. For raise panel the input is raise-to.
    // Use: raiseTo = currentBet + pot*fraction, clamped.
    const raiseTo = Math.min(
      Math.max(state.minimumRaiseTo, state.currentBet + amount),
      legal.maxBetOrRaiseTo,
    )
    setSizeBb(String(chipsToBb(raiseTo, state.bigBlind)))
  }

  return (
    <section className="action-panel" aria-labelledby="actions-title">
      <h2 id="actions-title">{ru.panels.actions}</h2>

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
        <button type="button" disabled={!legal.fold} onClick={() => onAction({ type: 'FOLD', position })}>
          {ru.buttons.fold}
        </button>
        <button type="button" disabled={!legal.check} onClick={() => onAction({ type: 'CHECK', position })}>
          {ru.buttons.check}
        </button>
        <button type="button" disabled={!legal.call} onClick={() => onAction({ type: 'CALL', position })}>
          {ru.buttons.call}
          {legal.call ? ` ${chipsToBb(legal.amountToCall, state.bigBlind)} ${ru.labels.bb}` : ''}
        </button>
        <button
          type="button"
          disabled={!legal.bet || sizeChips === null}
          onClick={() => {
            if (sizeChips === null) return
            onAction({ type: 'BET', position, amountChips: sizeChips })
          }}
        >
          {ru.buttons.bet}
        </button>
        <button
          type="button"
          disabled={!legal.raise || sizeChips === null}
          onClick={() => {
            if (sizeChips === null) return
            onAction({ type: 'RAISE', position, raiseToChips: sizeChips })
          }}
        >
          {ru.buttons.raise}
        </button>
      </div>

      <label className="size-input">
        {legal.bet ? ru.labels.betSize : ru.labels.raiseTo} ({ru.labels.bb})
        <input value={sizeBb} onChange={(event) => setSizeBb(event.target.value)} />
      </label>

      <div className="quick-sizes">
        <button type="button" onClick={() => applyQuick(1 / 3)}>
          {ru.quickSizes.third}
        </button>
        <button type="button" onClick={() => applyQuick(1 / 2)}>
          {ru.quickSizes.half}
        </button>
        <button type="button" onClick={() => applyQuick(2 / 3)}>
          {ru.quickSizes.twoThirds}
        </button>
        <button type="button" onClick={() => applyQuick(3 / 4)}>
          {ru.quickSizes.threeQuarters}
        </button>
        <button type="button" onClick={() => applyQuick(1)}>
          {ru.quickSizes.pot}
        </button>
        <button type="button" onClick={() => applyQuick('allin')}>
          {ru.quickSizes.allIn}
        </button>
      </div>

      <div className="utility-buttons">
        <button type="button" onClick={onNewHand}>
          {ru.buttons.newHand}
        </button>
        <button type="button" disabled={!canUndo} onClick={onUndo}>
          {ru.buttons.undo}
        </button>
        <button type="button" disabled={!canAdvance} onClick={onNextStreet}>
          {ru.buttons.nextStreet}
        </button>
      </div>
    </section>
  )
}
