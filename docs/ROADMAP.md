# Roadmap: V0 -> MVP

## Scope до MVP

Фиксируем ограничения:
- Texas Hold'em No-Limit.
- 6-max cash table.
- Все величины внутри движка хранятся в chips; UI умеет показывать chips и BB.
- Один Hero.
- Ручной ввод всех данных.
- Русский интерфейс.
- Без аккаунтов, backend, облака и базы данных.
- Без автоматизации взаимодействия с poker rooms.

---

## Status legend

- ✅ Done — реализовано в текущей ветке hand-builder core
- 🚧 Active product scope — Cash only
- ⏳ Later — не начинать без явного roadmap-этапа

---

## Game Modes architecture ✅

См. `docs/GAME_MODES.md`.

- Концептуально: `CASH | SNG | MTT`
- Runtime сейчас: только Cash 6-max NLHE
- Tournament logic запрещена без отдельного этапа

---

## V0.0 — Foundation ✅

Цель: получить чистый репозиторий, который стабильно запускается и проверяется.

Сделать:
- React + TypeScript + Vite.
- Vitest.
- ESLint + Prettier.
- CI на GitHub Actions: install -> lint -> typecheck -> test -> build.
- Базовую структуру проекта.
- Русский UI shell.
- Документацию архитектуры.
- Никакой покерной логики кроме типов-заглушек.

DoD:
- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
проходят локально и в CI.

---

## V0.1 — Cards & Table UI ✅

Цель: вручную собрать визуальное состояние стола.

Сделать:
- 6 позиций: UTG, HJ, CO, BTN, SB, BB.
- Hero можно назначить на любую позицию.
- Стек каждого игрока.
- CardPicker на 52 карты.
- Hole cards Hero.
- Board: flop / turn / river.
- Защита от выбора одной карты дважды.
- Reset hand.
- Новый UI не должен содержать покерной математики.

DoD:
- Нельзя выбрать дубликат карты.
- UI нормально работает от 1280px и выше.
- Все пользовательские надписи на русском.
- Состояние стола сериализуется в JSON.

---

## V0.2 — PokerState & Action State Machine ✅

Цель: перестать хранить раздачу как набор несвязанных полей UI.

Сделать:
- Immutable/Pure domain-модель `PokerState`.
- Street: PREFLOP / FLOP / TURN / RIVER.
- Action: FOLD / CHECK / CALL / BET / RAISE.
- История действий.
- Dealer/button/blinds.
- Active/folded/all-in status.
- Текущий bet-to-call.
- Минимальный legal raise.
- Effective stack.
- Переход между улицами только при завершённом betting round.
- Валидатор легальности действия.

DoD:
- UI работает через domain API, а не напрямую мутирует покерное состояние.
- Невозможные действия блокируются.
- Есть unit tests типовых betting sequences.

---

## V0.3 — Pot Engine ✅

Цель: всегда правильно знать деньги в банке.

Сделать:
- Contributions per player.
- Pot.
- To call.
- Effective stack.
- SPR.
- Pot odds.
- Side-pot модель заложить архитектурно, но полноценный multi-all-in можно оставить на более поздний этап.

Формулы должны жить только в `domain/math` или `engine/math`, не в React.

DoD:
- Golden tests для preflop raise/call, 3-bet pot, postflop bet/call, all-in.
- Ни одного вычисления pot odds в UI.

---

## V0.4 — Hand Evaluator

Цель: точно определять комбинацию Hero и сравнивать конкретные руки.

Сделать:
- Adapter `HandEvaluator`.
- Категории: high card, pair, two pair, trips, straight, flush, full house, quads, straight flush.
- Best 5 cards.
- Сравнение Hero vs конкретная рука Villain.
- Проверенные fixtures.

Можно использовать внешнюю evaluator-библиотеку, но:
- она должна быть скрыта за нашим интерфейсом;
- обязательно сравнивается с набором golden tests;
- доменная модель не зависит от API библиотеки.

DoD:
- Edge cases: wheel straight A2345, board plays, split pot, counterfeit, full house ordering.
- 100% совпадение golden tests.

---

## V0.5 — Equity Engine V1

Цель: быстро считать шансы Hero.

Режимы:
1. Hero vs exact hand.
2. Hero vs random hand.
3. Hero vs explicit range.

Архитектура:
- Exact enumeration когда пространство достаточно маленькое.
- Monte Carlo для больших пространств.
- Расчёты в Web Worker.
- Cancellation предыдущего расчёта при изменении входа.
- Seedable RNG для воспроизводимых тестов.
- Progressive result: быстрый приблизительный -> уточнённый.

Результат:
- win %
- tie %
- lose %
- equity %
- samples/combinations
- elapsed ms
- mode: exact / monte-carlo

DoD:
- UI не зависает во время расчёта.
- При изменении карт старый расчёт не может перезаписать новый.
- Есть convergence tests и known-equity fixtures.
- Отображается способ расчёта.

---

## V0.6 — Ranges V1

Цель: recommendation engine должен оценивать не "силу руки", а Hero против предполагаемого диапазона.

Сделать:
- Range notation: `AA`, `AKs`, `AQo`, `77+`, `AJs+`, диапазоны через запятую.
- Matrix 13x13.
- Presets:
  - Очень тайтовый
  - Тайтовый
  - Регуляр
  - Лузовый
  - Очень лузовый
  - Пользовательский
- Position-aware preflop presets.
- Удаление blocked combos с учётом Hero/Board.
- Вес combo 0..1 заложить в модель, UI весов можно добавить позднее.

DoD:
- Парсер покрыт unit tests.
- Отображается количество доступных combos.
- Blockers корректно уменьшают range.

---

## V0.7 — Decision Engine V1

Цель: первая честная рекомендация FOLD/CHECK/CALL/BET/RAISE.

Не делать вид, что это GTO.

Input:
- PokerState.
- Hero hand.
- Board.
- Villain range.
- Equity.
- Pot odds.
- SPR.
- Street.
- Position.
- Stack depth.
- Action history.

Output:
- primaryAction
- recommendedSizing
- alternatives[]
- confidence
- reasons[]
- warnings[]
- metrics snapshot

Первая версия:
- deterministic rule-based strategy.
- Call: сравнение equity с required equity + configurable safety margin.
- Raise/bet: отдельные правила value/bluff/semi-bluff; не выводить raise только потому, что equity > pot odds.
- Sizing presets: 25%, 33%, 50%, 66%, 75%, 100% pot и all-in, но legal sizing обязан проверяться state machine.
- Если данных недостаточно, выдавать `Недостаточно данных`, а не уверенное решение.

DoD:
- Decision engine — pure function.
- Каждая рекомендация объяснима.
- Есть scenario tests.
- UI показывает предупреждение, что рекомендация зависит от выбранного range.

---

## V0.8 — Preflop Strategy

Цель: качественный preflop, где Monte Carlo сам по себе недостаточен.

Сделать:
- Статические versioned charts для 6-max:
  - RFI по позициям.
  - facing open.
  - 3-bet / call / fold.
  - базовые blind defense сценарии.
- Chart lookup отделён от postflop decision engine.
- Все chart data лежат в versioned JSON/TS fixtures с указанием версии/источника/assumptions.
- Stack-depth scope для первой версии: 100 BB.

DoD:
- Preflop recommendation воспроизводима.
- UI показывает, какой chart/profile применён.
- Не смешивать неизвестные stack depths с 100BB charts без warning.

---

## V0.9 — UX & Hand Builder

Цель: вводить раздачу очень быстро.

Сделать:
- Горячие действия: Fold / Check / Call / Bet / Raise.
- Быстрые размеры: 1/3, 1/2, 2/3, 3/4 pot.
- Быстрый выбор позиции Hero.
- Undo последнего действия.
- Reset street / Reset hand.
- Hand timeline.
- Панель "Что посчитано".
- Панель "Почему".
- Локальная история последних раздач в памяти текущей сессии.
- Import/export PokerState JSON.

DoD:
- Обычную раздачу можно полностью внести без ручного редактирования JSON.
- Ошибки ввода объясняются по-русски.

---

## V0.10 — Performance & Correctness Gate

Цель: перед MVP не добавлять функции, а доказать качество ядра.

Сделать:
- Benchmark suite.
- Property-based tests для карт, deck uniqueness, range blockers и betting invariants.
- Fuzz-like generation legal PokerState.
- Performance telemetry только локально.
- Отдельные test fixtures для математики.
- Повторный аудит всех formulas.

Целевые UX-бюджеты на обычном desktop:
- изменение простого состояния UI: субъективно мгновенно, без заметной задержки;
- pot/SPR/pot odds: синхронно;
- первый equity preview: как можно быстрее, цель < 200 ms;
- refined equity: цель < 1 s;
- UI thread не блокируется equity loop.

Это performance targets, а не обещания для любого железа.

---

# MVP

MVP считается готовым, когда приложение позволяет:

1. Создать 6-max NLHE раздачу.
2. Назначить Hero.
3. Ввести стеки.
4. Ввести карты.
5. Полностью прокликать action history.
6. Автоматически посчитать pot / to call / effective stack / SPR / pot odds.
7. Задать Villain range через preset или matrix.
8. Быстро получить equity.
9. Получить одну из рекомендаций:
   - FOLD
   - CHECK
   - CALL
   - BET
   - RAISE
10. Для BET/RAISE получить legal sizing.
11. Увидеть:
   - equity;
   - required equity;
   - pot odds;
   - SPR;
   - range;
   - confidence;
   - объяснение;
   - предупреждения.
12. Undo/reset.
13. Export/import hand state.
14. Все core tests и CI зелёные.

## Не входит в MVP
- OCR.
- Screen capture.
- Auto-click.
- Реальные poker-room интеграции.
- Backend/account system.
- Tournament ICM.
- Omaha.
- Full solver / CFR.
- Claims of GTO optimality.
- HUD database по реальным соперникам.
