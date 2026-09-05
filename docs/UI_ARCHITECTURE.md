# UI Architecture

## Separation

| Layer | Responsibility |
|-------|----------------|
| `src/domain/*` | Hand state (`PokerState`), pure rules |
| `src/engine/*` | Equity, ranges, decision, analysis |
| `src/ui/*` | Presentation only |
| `src/i18n/ru.ts` | User-visible Russian strings |
| `src/assets/poker/*` | Visual sheets (no logic) |

Poker math and strategy **must not** live inside React components. UI reads state / engine results and renders them.

## Visual stack

```
assetMap / spriteMap  →  PlayingCard, ActionPanel, PokerTable
pokerTokens / pokerTheme.css  →  global navy / felt / gold chrome
chrome/*  →  shared analysis panel primitives
```

- **Cards / buttons / table art** — CSS sprites from sheets.
- **Equity, opponent, range, recommendation, metrics, timeline** — live React + CSS themed to the style reference; dynamic values never rasterized into PNGs.
- Static action button labels on the button sheet are allowed; `aria-label` still comes from `ru`.

## Layout

Desktop-first: table + hero cards on the left, analytics sidebar on the right (`App.css` grid). Mobile collapses to a single column.

## Out of scope for asset pack

- Domain / equity / range / decision behavior changes
- Canvas / WebGL
- Slicing sheets into hundreds of files (sprites preferred)
- Preflop strategy / GTO claims
