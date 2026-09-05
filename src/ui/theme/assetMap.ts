import heartsSheet from '../../assets/poker/cards/hearts_sheet.png'
import diamondsSheet from '../../assets/poker/cards/diamonds_sheet.png'
import clubsSheet from '../../assets/poker/cards/clubs_sheet.png'
import spadesSheet from '../../assets/poker/cards/spades_sheet.png'
import cardBacksAndFrames from '../../assets/poker/cards/card_backs_and_frames.png'
import tableAndMarkers from '../../assets/poker/table/table_and_markers.png'
import staticButtons from '../../assets/poker/buttons/static_buttons.png'
import type { Suit } from '../../domain/cards/Card'

export type AssetKind = 'runtime' | 'reference'

/**
 * Runtime asset URLs (Vite-hashed). Reference PNGs under `assets/poker/reference/`
 * and unused chip sheet stay on disk for docs/moodboard — do not import them here
 * or they enter the production bundle.
 */
export const pokerAssets = {
  cards: {
    h: { url: heartsSheet, kind: 'runtime' as const },
    d: { url: diamondsSheet, kind: 'runtime' as const },
    c: { url: clubsSheet, kind: 'runtime' as const },
    s: { url: spadesSheet, kind: 'runtime' as const },
    backsAndFrames: { url: cardBacksAndFrames, kind: 'runtime' as const },
  },
  table: { url: tableAndMarkers, kind: 'runtime' as const },
  buttons: { url: staticButtons, kind: 'runtime' as const },
  /** Paths relative to `src/assets/poker` — not bundled until imported. */
  onDisk: {
    chips: 'chips/chips_and_tokens.png',
    referencePanels: 'reference/style_reference_panels.png',
    referenceMixed: 'reference/mixed_reference_sheet.png',
  },
} as const

export function suitSheetUrl(suit: Suit): string {
  return pokerAssets.cards[suit].url
}
