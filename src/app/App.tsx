import { useMemo, useState } from 'react'
import {
  advanceStreet,
  applyAction,
  createInitialState,
  getHandMetrics,
  getUsedCards,
  newHand,
  setBoardCard,
  setHeroCard,
  setHeroPosition,
  setPlayerStackBb,
} from '../domain/game'
import type { Card } from '../domain/cards/Card'
import type { PokerAction } from '../domain/game/PokerAction'
import type { PokerState } from '../domain/game/PokerState'
import type { Position } from '../domain/game/Position'
import type { DomainError } from '../domain/game/PokerState'
import { ActionPanel } from '../ui/actions/ActionPanel'
import { CardPicker } from '../ui/cards/CardPicker'
import { ActionTimeline } from '../ui/history/ActionTimeline'
import { MetricsPanel } from '../ui/metrics/MetricsPanel'
import { PokerTable } from '../ui/table/PokerTable'
import { ru } from '../i18n/ru'
import './App.css'

type CardSlot =
  | { kind: 'hero'; index: 0 | 1 }
  | { kind: 'board'; index: 0 | 1 | 2 | 3 | 4 }

function translateError(error: DomainError): string {
  return ru.errors[error.code] ?? error.message
}

export function App() {
  const [state, setState] = useState<PokerState>(() => createInitialState())
  const [history, setHistory] = useState<PokerState[]>([])
  const [slot, setSlot] = useState<CardSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)

  const metrics = useMemo(() => getHandMetrics(state), [state])
  const used = useMemo(() => getUsedCards(state), [state])

  function pushState(next: PokerState) {
    setHistory((prev) => [...prev, state])
    setState(next)
    setError(null)
  }

  function handleAction(action: PokerAction) {
    const result = applyAction(state, action)
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
  }

  function handleUndo() {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev
      }
      const clone = [...prev]
      const previous = clone.pop()
      if (previous) {
        setState(previous)
        setError(null)
      }
      return clone
    })
  }

  function handleNewHand() {
    pushState(newHand(state))
    setSlot(null)
  }

  function handleNextStreet() {
    const result = advanceStreet(state)
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
  }

  function handlePick(card: Card) {
    if (!slot) {
      return
    }
    const result =
      slot.kind === 'hero'
        ? setHeroCard(state, slot.index, card)
        : setBoardCard(state, slot.index, card)
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
    setSlot(null)
  }

  function handleClearCard() {
    if (!slot) {
      return
    }
    const result =
      slot.kind === 'hero'
        ? setHeroCard(state, slot.index, null)
        : setBoardCard(state, slot.index, null)
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
    setSlot(null)
  }

  function slotHasCard(): boolean {
    if (!slot) return false
    return slot.kind === 'hero'
      ? state.heroCards[slot.index] !== null
      : state.board[slot.index] !== null
  }

  function selectedSlotKey(): string | null {
    if (!slot) return null
    return slot.kind === 'hero' ? `hero-${slot.index}` : `board-${slot.index}`
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{ru.appName}</h1>
          <p className="app-subtitle">{ru.appSubtitle}</p>
        </div>
        <div className="mode-badge" aria-label={`${ru.mode}: ${ru.modeCash}`}>
          {ru.mode}: <strong>{ru.modeCash}</strong>
        </div>
      </header>

      {error ? <div className="app-error">{error}</div> : null}

      <main className="app-layout">
        <div className="app-main">
          <PokerTable
            state={state}
            selectedSlot={selectedSlotKey()}
            onSelectHero={(position: Position) => pushState(setHeroPosition(state, position))}
            onStackChange={(position, stackBb) => {
              const result = setPlayerStackBb(state, position, stackBb)
              if (!result.ok) {
                setError(translateError(result.error))
                return
              }
              pushState(result.state)
            }}
            onHeroCardClick={(index) => setSlot({ kind: 'hero', index })}
            onBoardCardClick={(index) => setSlot({ kind: 'board', index })}
          />
          {slot ? (
            <CardPicker
              used={used}
              onPick={handlePick}
              onClear={handleClearCard}
              canClear={slotHasCard()}
              onClose={() => setSlot(null)}
            />
          ) : null}
        </div>

        <aside className="app-sidebar">
          <MetricsPanel metrics={metrics} bigBlind={state.bigBlind} />
          <ActionPanel
            state={state}
            onAction={handleAction}
            onNewHand={handleNewHand}
            onUndo={handleUndo}
            onNextStreet={handleNextStreet}
            canUndo={history.length > 0}
            canAdvance={metrics.canAdvanceStreet}
          />
          <ActionTimeline history={state.actionHistory} bigBlind={state.bigBlind} />
          <section className="recommendation-panel" aria-labelledby="recommendation-title">
            <h2 id="recommendation-title">{ru.panels.recommendation}</h2>
            <p>{ru.labels.recommendationSoon}</p>
          </section>
          {import.meta.env.DEV ? (
            <section className="debug-panel">
              <button type="button" onClick={() => setShowJson((value) => !value)}>
                {showJson ? ru.labels.hideState : ru.labels.showState}
              </button>
              {showJson ? <pre>{JSON.stringify(state, null, 2)}</pre> : null}
            </section>
          ) : null}
        </aside>
      </main>
    </div>
  )
}
