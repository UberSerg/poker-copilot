# Poker Copilot

Локальный учебный калькулятор Texas Hold'em с ручным вводом состояния стола.

## Цель
Пользователь вручную задаёт игроков, позиции, стеки, карты, действия и размеры ставок.
Приложение рассчитывает состояние раздачи, equity, pot odds, SPR и выдаёт объяснимую рекомендацию:
FOLD / CHECK / CALL / BET / RAISE + sizing.

## Текущий scope
- Режим: **Cash** (6-max NLHE).
- SNG / MTT — только архитектурный задел (см. `docs/GAME_MODES.md`).
- Без equity / recommendation на текущем этапе hand-builder core.

## Принципы
- Только локальный учебный/симуляционный сценарий.
- Без захвата экрана, OCR, автокликов и интеграций с реальными poker rooms.
- Русский интерфейс.
- Математика отделена от UI.
- Решение не должно называться GTO, пока в проекте нет проверенного solver-based слоя.
- Качество и воспроизводимость важнее количества функций.
- Tournament logic не реализовывать без отдельного roadmap-этапа.

## Стек
- React
- TypeScript
- Vite
- Vitest
- ESLint
- Prettier
- Web Worker для тяжёлых equity-расчётов (позже)
- Дополнительная библиотека hand evaluator допускается только за интерфейсом-адаптером и с тестами

## Документация
- `docs/ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/GAME_MODES.md`
- `docs/CURSOR_CONTRACT.md`
- `docs/MCP.md`
