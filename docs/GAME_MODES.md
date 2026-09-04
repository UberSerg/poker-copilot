# Game Modes

Концептуальные режимы продукта:

```ts
type GameMode = 'CASH' | 'SNG' | 'MTT'
```

Текущий активный продуктовый scope: **6-max NLHE CASH**.

SNG и MTT — только архитектурный задел. Реализацию tournament logic без отдельного roadmap-этапа запрещено.

## Cash (сейчас)

Реализуется:

- NLHE;
- 6-max;
- blinds;
- stacks;
- действия игроков;
- pot;
- SPR;
- pot odds;
- cash strategy — в будущем.

## SNG (позже)

Будущий режим:

- blind levels;
- ante;
- payouts;
- players remaining;
- bubble;
- stack distribution;
- ICM.

## MTT (позже)

Будущий режим:

- blind/ante schedule;
- tournament stage;
- меняющееся количество игроков;
- payout ladder;
- players remaining;
- average stack;
- bubble;
- final table;
- ICM;
- tournament-specific strategy.

## Архитектура

```text
Shared Poker Core
├── Cards
├── Deck
├── PokerState
├── Betting Engine
├── Pot Engine
├── Hand Evaluator
├── Equity Engine
└── Ranges

Strategy
├── CashStrategyEngine
└── TournamentStrategyEngine
    ├── SNG
    └── MTT
```

Shared Poker Core общий для всех режимов.
Различие режимов живёт в Strategy-слое и в tournament-specific state (когда появится roadmap-этап).
