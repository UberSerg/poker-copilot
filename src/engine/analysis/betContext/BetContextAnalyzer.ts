export type BetSizeClass = 'SMALL' | 'MEDIUM' | 'LARGE' | 'OVERBET'

export interface BetContext {
  potFraction: number
  size: BetSizeClass
  description: string[]
}

/**
 * Classify facing bet size relative to pot before the call.
 * potFraction = bet / pot (when amountToCall approximates the bet into pot).
 */
export function analyzeBetContext(potChips: number, amountToCall: number): BetContext {
  if (amountToCall <= 0 || potChips <= 0) {
    return {
      potFraction: 0,
      size: 'SMALL',
      description: ['Нет ставки для классификации'],
    }
  }
  // Classify bet vs current pot (includes the bet if already posted).
  const potFraction = amountToCall / potChips

  let size: BetSizeClass
  if (potFraction > 1) size = 'OVERBET'
  else if (potFraction > 0.66) size = 'LARGE'
  else if (potFraction > 0.33) size = 'MEDIUM'
  else size = 'SMALL'

  const labels: Record<BetSizeClass, string> = {
    SMALL: 'Небольшой размер ставки',
    MEDIUM: 'Средний размер ставки',
    LARGE: 'Крупный размер ставки',
    OVERBET: 'Овербет',
  }

  return {
    potFraction,
    size,
    description: [labels[size], `≈ ${Math.round(potFraction * 100)}% банка`],
  }
}
