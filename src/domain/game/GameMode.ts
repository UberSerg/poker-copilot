export type GameMode = 'CASH' | 'SNG' | 'MTT'

export const ACTIVE_GAME_MODE: GameMode = 'CASH'

export function isSupportedGameMode(mode: GameMode): mode is 'CASH' {
  return mode === 'CASH'
}
