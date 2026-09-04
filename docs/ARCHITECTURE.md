# Architecture

## Главный принцип

UI не знает покерную математику.
Strategy не знает React.
Equity engine не знает UI.
PokerState является единым источником истины о раздаче.

## Текущий runtime flow

```text
UI
→ Domain Action / Card Edit
→ PokerState (immutable)
→ Selectors / Math
→ UI Metrics & Controls
```

React вызывает только domain API (`applyAction`, `setHeroCard`, …) и читает selectors.
Формулы pot odds / SPR / to-call живут в `src/domain/math` и `src/domain/game/selectors.ts`, не в JSX.

## Betting core hardening

### Betting round completion

После каждого `applyAction`:

1. строится новый `PokerState`;
2. если `isBettingRoundComplete` — `actingPosition = null`;
3. иначе `actingPosition` = следующий игрок, которому ещё нужно действие.

Invariant: round complete ⇒ `actingPosition === null`.
В этом состоянии разрешён только `advanceStreet()`; FOLD/CHECK/CALL/BET/RAISE → `BETTING_ROUND_COMPLETE`.

Round complete, когда каждый active player:

- `committedThisStreet === currentBet` (или check при `currentBet === 0`);
- и `lastActedBetLevel[position] !== null` (добровольное действие на улице уже было).

### Raise rights / short all-in

`lastActedBetLevel[position]`:

- `null` — игрок ещё не добровольно действовал на улице (блайнды не считаются);
- иначе — уровень `currentBet` на момент последнего действия.

`canPlayerRaise`:

- не действовал (`null`) → raise открыт;
- уже действовал → raise открыт только если `currentBet - lastActedBetLevel >= lastFullRaiseSize`.

Неполный all-in raise:

- поднимает `currentBet`;
- **не** меняет `lastFullRaiseSize`;
- `minimumRaiseTo = currentBet + lastFullRaiseSize`.

### Effective stack / SPR

Для текущего решения:

- effective stack = `min(hero.stackChips, contender.stackChips…)` — chips **behind**, без committed;
- multiway: минимум между Hero и оставшимися contenders (промежуточное правило);
- `SPR = effectiveStackBehind / currentPot`.

### Setup locking

`canEditHandSetup` = в истории только `POST_BLIND`.

До первого voluntary action можно менять starting stacks и Hero.
`setPlayerStartingStackBb` задаёт **начальный** стек; behind = starting − committed (уже посты блайндов).
После fold/call/check/bet/raise — `SETUP_LOCKED`.

### Pot invariant

`getPot(state) = sum(committedTotal)` — source of truth.
`state.pot` — cache; `validateStateInvariants` проверяет равенство и economics `starting = stack + committedTotal`.

## Game modes

См. `docs/GAME_MODES.md`.

Активный runtime: `CASH` (6-max NLHE).
SNG / MTT — архитектурный задел без реализации.

```text
Shared Poker Core
├── Cards / Deck
├── PokerState
├── Betting Engine
├── Pot Engine
├── Hand Evaluator   (позже)
├── Equity Engine    (позже)
└── Ranges           (позже)

Strategy (позже)
├── CashStrategyEngine
└── TournamentStrategyEngine
    ├── SNG
    └── MTT
```

## Структура

```text
src/
  app/
    App.tsx
    routes.ts
  domain/
    cards/
      Card.ts
      deck.ts
      cardUtils.ts
    game/
      GameMode.ts
      Position.ts
      Street.ts
      PlayerState.ts
      PokerState.ts
      PokerAction.ts
      createInitialState.ts
      applyAction.ts
      validators.ts
      legalActions.ts
      transitions.ts
      raiseRights.ts
      invariants.ts
      selectors.ts
      cardEdits.ts
      stackEdits.ts
    math/
      chips.ts
      pot.ts
      potOdds.ts
      effectiveStack.ts
      spr.ts
  engine/          # equity / evaluator / ranges — позже
  workers/
  ui/
    table/
    cards/
    actions/
    history/
    metrics/
    recommendation/
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

### Money

- Внутри domain все денежные величины — integer chips.
- BB — только UI conversion/display через `chipsToBb` / `bbToChips`.
- Не использовать floating point для chips.

### DecisionResult

Контракт recommendation engine (ещё не реализован):

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

На этапе hand-builder все обновления синхронные.

## Correctness

Никакой формулы в JSX/TSX.
Все числа хранятся без форматированных строк.
Денежные величины внутри domain — integer chips.
BB — display/input conversion layer.
Не использовать floating point для chips.
PokerState сериализуем через `JSON.stringify` (нет функций/React-объектов).
