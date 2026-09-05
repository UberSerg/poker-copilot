import { useEffect, useMemo, useRef, useState } from 'react'
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
  setOpponentCard,
  setPlayerStartingStackBb,
} from '../domain/game'
import {
  formatHeroComboRu,
  getBoardCards,
  getHeroEvaluatedHand,
  getOpponentEvaluatedHand,
  getShowdownResult,
} from '../domain/game/equitySelectors'
import type { Card } from '../domain/cards/Card'
import type { PokerAction } from '../domain/game/PokerAction'
import type { PokerState } from '../domain/game/PokerState'
import type { Position } from '../domain/game/Position'
import type { DomainError } from '../domain/game/PokerState'
import { MC_PRESETS } from '../engine/equity/types'
import type { OpponentMode } from '../engine/equity/types'
import { formatHandClass, type HandClass } from '../engine/ranges/HandClass'
import type { RangeStats } from '../engine/ranges/stats'
import { ActionPanel } from '../ui/actions/ActionPanel'
import { CardPicker } from '../ui/cards/CardPicker'
import { EquityPanel } from '../ui/equity/EquityPanel'
import { OpponentPanel } from '../ui/equity/OpponentPanel'
import { ActionTimeline } from '../ui/history/ActionTimeline'
import { MetricsPanel } from '../ui/metrics/MetricsPanel'
import { RangeEditor } from '../ui/ranges/RangeEditor'
import { RecommendationPanel } from '../ui/decision/RecommendationPanel'
import { evaluateDecision } from './analysis/DecisionService'
import { PokerTable } from '../ui/table/PokerTable'
import { EquityWorkerClient } from '../workers/EquityWorkerClient'
import {
  createInitialAnalysisState,
  setEquityPrecision,
  setOpponentMode,
  setRangeFromText,
  setRangeModel,
  type AnalysisState,
} from './analysis/AnalysisState'
import { buildAnalysisEquityInput } from './analysis/equityInputSelector'
import {
  createInitialEquityUiState,
  type EquityCalculationState,
  type PrecisionPreset,
} from './equityUiState'
import { ru } from '../i18n/ru'
import './App.css'

type CardSlot =
  | { kind: 'hero'; index: 0 | 1 }
  | { kind: 'board'; index: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'opp'; index: 0 | 1 }

function translateError(error: DomainError): string {
  return ru.errors[error.code] ?? error.message
}

export function App() {
  const [state, setState] = useState<PokerState>(() => createInitialState())
  const [history, setHistory] = useState<PokerState[]>([])
  const [slot, setSlot] = useState<CardSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisState>(() => createInitialAnalysisState())
  const [equityUi, setEquityUi] = useState<EquityCalculationState>(() => createInitialEquityUiState())
  const [selectedRangeKey, setSelectedRangeKey] = useState<string | null>(null)
  const workerRef = useRef<EquityWorkerClient | null>(null)

  const metrics = useMemo(() => getHandMetrics(state), [state])
  const used = useMemo(
    () =>
      getUsedCards(state, {
        includeOpponent: analysis.opponentMode === 'EXACT',
      }),
    [state, analysis.opponentMode],
  )
  const heroHand = useMemo(() => getHeroEvaluatedHand(state), [state])
  const opponentHand = useMemo(() => getOpponentEvaluatedHand(state), [state])
  const showdown = useMemo(() => getShowdownResult(state), [state])
  const heroComboLabel = useMemo(() => formatHeroComboRu(state), [state])
  const knownForRange = useMemo(() => {
    const hero = state.heroCards.filter((c): c is Card => c !== null)
    return [...hero, ...getBoardCards(state)]
  }, [state])

  const equityBuild = useMemo(
    () => buildAnalysisEquityInput(state, analysis, MC_PRESETS[analysis.equityPrecision]),
    [state, analysis],
  )
  const rangeStats: RangeStats | null =
    equityBuild.ok && analysis.opponentMode === 'RANGE'
      ? (equityBuild.rangeStats ?? null)
      : null
  const equityBlockedReason = equityBuild.ok ? null : equityBuild.reason

  useEffect(() => {
    workerRef.current = new EquityWorkerClient()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!equityBuild.ok) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      const client = workerRef.current
      if (!client || cancelled) return

      setEquityUi((prev) => ({
        ...prev,
        status: 'CALCULATING',
        errorMessage: null,
      }))

      void client.calculate(equityBuild.input).then((response) => {
        if (cancelled) return
        if (!response.ok) {
          if (response.code === 'CANCELLED') {
            return
          }
          setEquityUi((prev) => ({
            ...prev,
            status: 'ERROR',
            errorMessage: response.message || ru.equity.calcFailed,
            result: null,
          }))
          return
        }
        const outcome = response.outcome
        if (!outcome.ok) {
          const message =
            outcome.error.code === 'RANGE_EMPTY_AFTER_BLOCKERS'
              ? ru.equity.rangeEmptyAfterBlockers
              : ru.equity.calcFailed
          setEquityUi((prev) => ({
            ...prev,
            status: 'ERROR',
            errorMessage: message,
            result: null,
          }))
          return
        }
        setEquityUi((prev) => ({
          ...prev,
          status: 'SUCCESS',
          result: outcome.result,
          errorMessage: null,
          requestId: response.requestId,
        }))
      })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [equityBuild])

  const equityStatus =
    equityBlockedReason !== null ? ('IDLE' as const) : equityUi.status
  const equityResult = equityBlockedReason !== null ? null : equityUi.result
  const equityError = equityBlockedReason !== null ? null : equityUi.errorMessage

  const recommendationView = useMemo(() => {
    const outcome = evaluateDecision(state, analysis, equityResult)
    if (!outcome.ok) {
      return { kind: 'UNAVAILABLE' as const, message: outcome.message }
    }
    return { kind: 'RESULT' as const, result: outcome.result }
  }, [state, analysis, equityResult])

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

  function applyCardEdit(card: Card | null) {
    if (!slot) return null
    if (slot.kind === 'hero') return setHeroCard(state, slot.index, card)
    if (slot.kind === 'opp') return setOpponentCard(state, slot.index, card)
    return setBoardCard(state, slot.index, card)
  }

  function handlePick(card: Card) {
    const result = applyCardEdit(card)
    if (!result) return
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
    setSlot(null)
  }

  function handleClearCard() {
    const result = applyCardEdit(null)
    if (!result) return
    if (!result.ok) {
      setError(translateError(result.error))
      return
    }
    pushState(result.state)
    setSlot(null)
  }

  function slotHasCard(): boolean {
    if (!slot) return false
    if (slot.kind === 'hero') return state.heroCards[slot.index] !== null
    if (slot.kind === 'opp') return state.opponentCards[slot.index] !== null
    return state.board[slot.index] !== null
  }

  function selectedSlotKey(): string | null {
    if (!slot) return null
    if (slot.kind === 'hero') return `hero-${slot.index}`
    if (slot.kind === 'opp') return `opp-${slot.index}`
    return `board-${slot.index}`
  }

  function handleOpponentMode(mode: OpponentMode) {
    setAnalysis((prev) => setOpponentMode(prev, mode))
  }

  function handlePrecision(precision: PrecisionPreset) {
    setAnalysis((prev) => setEquityPrecision(prev, precision))
  }

  function handleRangeText(text: string) {
    setAnalysis((prev) => setRangeFromText(prev, text))
  }

  function handleRangeModel(range: AnalysisState['range']) {
    setAnalysis((prev) => setRangeModel(prev, range))
  }

  function handleSelectHand(hand: HandClass | null) {
    setSelectedRangeKey(hand ? formatHandClass(hand) : null)
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
            onSelectHero={(position: Position) => {
              const result = setHeroPosition(state, position)
              if (!result.ok) {
                setError(translateError(result.error))
                return
              }
              pushState(result.state)
            }}
            onStartingStackChange={(position, startingStackBb) => {
              const result = setPlayerStartingStackBb(state, position, startingStackBb)
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
          {analysis.opponentMode === 'RANGE' ? (
            <RangeEditor
              range={analysis.range}
              rangeText={analysis.rangeText}
              parseError={analysis.rangeParseError}
              knownCards={knownForRange}
              selectedKey={selectedRangeKey}
              onTextChange={handleRangeText}
              onRangeChange={handleRangeModel}
              onSelectHand={handleSelectHand}
            />
          ) : null}
        </div>

        <aside className="app-sidebar">
          <MetricsPanel metrics={metrics} bigBlind={state.bigBlind} />
          <EquityPanel
            status={equityStatus}
            result={equityResult}
            errorMessage={equityError}
            precision={analysis.equityPrecision}
            onPrecisionChange={handlePrecision}
            blockedReason={equityBlockedReason}
            opponentMode={analysis.opponentMode}
            rangeStats={analysis.opponentMode === 'RANGE' ? rangeStats : null}
          />
          <OpponentPanel
            mode={analysis.opponentMode}
            cards={state.opponentCards}
            selectedSlot={selectedSlotKey()}
            onModeChange={handleOpponentMode}
            onCardClick={(index) => setSlot({ kind: 'opp', index })}
            heroHand={heroHand}
            opponentHand={opponentHand}
            showdown={showdown}
            heroComboLabel={heroComboLabel}
          />
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
          <RecommendationPanel view={recommendationView} />
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
