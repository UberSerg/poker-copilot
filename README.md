# Poker Copilot

Локальный учебный калькулятор Texas Hold'em с ручным вводом состояния стола.

## Цель
Пользователь вручную задаёт игроков, позиции, стеки, карты, действия и размеры ставок.
Приложение рассчитывает состояние раздачи, equity (включая против диапазона), pot odds и SPR.
Рекомендации FOLD/CHECK/CALL/BET/RAISE появятся на этапе Decision Engine.

## Реализовано
- Cash 6-max Hand Builder
- Betting Engine (с hardening)
- Pot / SPR / Pot Odds
- Hand Evaluator (best five + RU labels)
- Exact Equity / Monte Carlo Equity / Web Worker
- Exact / Random / Range opponent
- Range Engine (parser, weights, blockers, 13×13 matrix)
- Decision Engine V1 (rule-based postflop assistant — **не GTO**)
- Decision Intelligence: board texture, hand context, explanation sections, audit
- Poker UI asset pack: sprite cards/buttons/table, navy analysis chrome (live panels)

## Текущий scope
- Режим: **Cash** (6-max NLHE).
- SNG / MTT — только архитектурный задел (см. `docs/GAME_MODES.md`).
- GTO / solver / preflop charts / outs — **ещё не реализованы**.

> Следующий крупный этап (preflop charts) — только после архитектурного ревью.

## Принципы
- Только локальный учебный/симуляционный сценарий.
- Без захвата экрана, OCR, автокликов и интеграций с реальными poker rooms.
- Русский интерфейс.
- Математика отделена от UI (`PokerState` + `AnalysisState`).
- Решение не должно называться GTO, пока в проекте нет проверенного solver-based слоя.
- Пользовательский range ≠ «правильная» стратегия.
- Качество и воспроизводимость важнее количества функций.

## Стек
- React + TypeScript + Vite
- Vitest, ESLint, Prettier
- Web Worker для тяжёлых equity-расчётов
- `@pokertools/evaluator` только за adapter layer + parity tests

## Команды
```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run benchmark
```

## Документация
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/GAME_MODES.md`
- `docs/CURSOR_CONTRACT.md`
- `docs/ASSETS.md`
- `docs/UI_ARCHITECTURE.md`
- `docs/MCP.md`
