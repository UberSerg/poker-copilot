# Первый промт для Cursor

Ты работаешь в новом публичном репозитории проекта Poker Copilot.

Сначала прочитай:
- README.md
- docs/ROADMAP.md
- docs/ARCHITECTURE.md
- docs/CURSOR_CONTRACT.md
- все `.cursor/rules/*.mdc`.

Работаем только над этапом **V0.0 Foundation**.

Задача:
1. Инициализировать React + TypeScript + Vite проект в текущем репозитории.
2. Настроить strict TypeScript.
3. Настроить ESLint и Prettier.
4. Настроить Vitest.
5. Добавить scripts:
   - dev
   - build
   - lint
   - typecheck
   - test
6. Создать базовую структуру директорий из `docs/ARCHITECTURE.md`, но не реализовывать будущую покерную логику.
7. Создать минимальный русский UI shell:
   - название «Poker Copilot»;
   - подпись «Учебный калькулятор Texas Hold'em»;
   - пустые области «Стол», «Действия», «Расчёты», «Рекомендация».
8. Добавить GitHub Actions CI:
   `npm ci -> lint -> typecheck -> test -> build`.
9. Добавить минимальный smoke test.
10. Запустить все проверки.
11. Создать ветку `feature/v0-0-foundation`, сделать логичный commit и push, если remote уже настроен.

Ограничения:
- Не реализовывать CardPicker.
- Не реализовывать PokerState.
- Не добавлять poker evaluator.
- Не добавлять equity.
- Не добавлять backend.
- Не добавлять UI framework без необходимости.
- Не менять roadmap.
- Не добавлять MCP.

Перед кодом кратко напиши план V0.0.
После работы верни отчёт строго по `docs/CURSOR_CONTRACT.md`.
