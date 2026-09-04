# Architecture

## Главный принцип

UI не знает покерную математику.
Strategy не знает React.
Equity engine не знает UI.
PokerState является единым источником истины о раздаче.

## Предлагаемая структура

```text
src/
  app/
    App.tsx
    routes.ts
  domain/
    cards/
      Card.ts
      Deck.ts
    game/
      PokerState.ts
      PlayerState.ts
      Action.ts
      Street.ts
      Position.ts
      reducer.ts
      validators.ts
    math/
      pot.ts
      potOdds.ts
      spr.ts
      effectiveStack.ts
  engine/
    hand-evaluator/
      HandEvaluator.ts
      adapter.ts
    equity/
      EquityEngine.ts
      exact.ts
      monteCarlo.ts
      rng.ts
    ranges/
      Range.ts
      parser.ts
      blockers.ts
      presets.ts
    strategy/
      DecisionEngine.ts
      preflop/
      postflop/
      sizing.ts
  workers/
    equity.worker.ts
  ui/
    table/
    cards/
    actions/
    ranges/
    recommendation/
    metrics/
  i18n/
    ru.ts
  test/
    fixtures/
    scenarios/
benchmarks/
docs/
```

## Domain contracts

### Card

```ts
type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A'
type Suit = 'c'|'d'|'h'|'s'
type Card = `${Rank}${Suit}`
```

### DecisionResult

```ts
type DecisionAction = 'FOLD'|'CHECK'|'CALL'|'BET'|'RAISE'

interface DecisionResult {
  primaryAction: DecisionAction
  recommendedSizing?: {
    amountChips: number
    potFraction?: number
  }
  alternatives: Array<{
    action: DecisionAction
    score?: number
    sizingChips?: number
  }>
  confidence: 'LOW'|'MEDIUM'|'HIGH'
  reasons: string[]
  warnings: string[]
  metrics: {
    equity?: number
    requiredEquity?: number
    potOdds?: number
    spr?: number
  }
}
```

## Performance

Тяжёлый equity loop не запускается на React main thread.
Worker requests имеют monotonically increasing request id.
UI принимает только результат последнего актуального request id.

## Correctness

Никакой формулы в JSX/TSX.
Все числа хранятся без форматированных строк.
Денежные величины внутри domain — integer chips.
BB — display/input conversion layer.
Не использовать floating point для chips.
