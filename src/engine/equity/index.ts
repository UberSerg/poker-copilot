import { calculateExact, shouldUseExactEnumeration } from './exact'
import { calculateMonteCarlo } from './monteCarlo'
import type { EquityEngine, EquityInput, EquityOutcome } from './types'
import { validateEquityInput } from './validateInput'

export class DefaultEquityEngine implements EquityEngine {
  calculate(input: EquityInput): EquityOutcome {
    const error = validateEquityInput(input)
    if (error) {
      return { ok: false, error }
    }

    // Always prefer exact when cheap enough, regardless of UI MC precision.
    if (shouldUseExactEnumeration(input)) {
      return calculateExact(input)
    }

    return calculateMonteCarlo(input, {
      iterations: input.iterations,
      seed: input.seed,
    })
  }
}

export function createEquityEngine(): EquityEngine {
  return new DefaultEquityEngine()
}

export {
  shouldUseExactEnumeration,
  estimateExactCombinations,
  estimateExactScenarios,
} from './exact'
export { calculateExact } from './exact'
export { calculateMonteCarlo } from './monteCarlo'
export { validateEquityInput } from './validateInput'
export { createSeededRandom, sampleWithoutReplacement } from './rng'
export { MAX_EXACT_COMBINATIONS, MAX_EXACT_SCENARIOS, MC_PRESETS } from './types'
export type {
  EquityEngine,
  EquityInput,
  EquityResult,
  EquityOutcome,
  EquityError,
  EquityErrorCode,
  EquityMode,
  OpponentMode,
} from './types'
