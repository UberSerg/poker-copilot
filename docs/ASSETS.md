# UI Assets

## Layout

Runtime PNG sheets live under `src/assets/poker/`:

| Path | Role |
|------|------|
| `cards/*_sheet.png` | Face sprites by suit |
| `cards/card_backs_and_frames.png` | Backs / empty frames |
| `table/table_and_markers.png` | Table felt + decorative markers |
| `chips/chips_and_tokens.png` | Chip / token sheet (available for markers) |
| `buttons/static_buttons.png` | Fold/Check/Call/Bet/Raise/utility buttons |
| `reference/*` | Moodboard only — **not** used as live UI chrome |

Manifest: `src/assets/poker/assets-manifest.json`.

Sheet size: **1448×1086**.

## Runtime vs reference

- **Runtime** — imported via `src/ui/theme/assetMap.ts` and cropped with CSS sprites (`spriteMap.ts`).
- **Reference** (`style_reference_panels.png`, `mixed_reference_sheet.png`) — style guide only. Analysis panels, metrics, recommendations stay **live HTML/CSS + `ru` i18n**. Never bake equity/recommendation text into images.

## Card sprite map

Suit sheets use a **4×4** grid, rank order:

```
A  K  Q  J
T  9  8  7
6  5  4  3
2  ·  ·  ·
```

`PlayingCard` sets `background-size: 400% 400%` and `background-position` from rank/suit.

## Button sprite map

`static_buttons.png` is a **3×3** grid:

| Fold | Check | Call |
| Bet  | Raise | Next street |
| New hand | Undo/Cancel | (blank) |

Quick sizes and BB inputs remain live controls.

## Theme

- Tokens: `src/ui/theme/pokerTokens.ts`
- CSS variables: `src/ui/theme/pokerTheme.css`
- Chrome primitives: `src/ui/chrome/*` (`AnalysisPanelFrame`, `MetricCard`, `StatusBadge`, `SectionCard`)
